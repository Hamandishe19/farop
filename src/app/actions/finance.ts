"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { refusalMessage, requireAdmin } from "@/lib/auth/admin";
import { PRODUCT_IMAGES_BUCKET, storagePath } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import {
  parseMoney,
  readExpenseForm,
  readSaleForm,
  validateCategoryName,
  validateExpense,
  validateSale,
  type ExpenseFormErrors,
  type ExpenseFormValues,
  type SaleFormErrors,
  type SaleFormValues,
} from "@/lib/validation/finance";
import { listAdminProducts } from "@/services/admin-products";
import { listExpenseCategories } from "@/services/finance";
import { PRODUCTS_TAG } from "@/services/products";
import { CUSTOM_CATEGORY_PREFIX, SALE_STATUSES, type SaleStatus } from "@/types/finance";

/**
 * Recording sales, expenses and cost prices. Every action needs the
 * "finance.edit" permission (supreme / developer admins, or a regular admin
 * who has been granted "Record sales & expenses"). The database's security
 * rules check the same permission again.
 */

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const refresh = () => revalidatePath("/admin/finance", "layout");

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export type SaleFormState =
  | { status: "idle" }
  | { status: "invalid"; errors: SaleFormErrors; values: SaleFormValues }
  | { status: "refused"; message: string; values: SaleFormValues };

export async function saveSale(_prev: SaleFormState, formData: FormData): Promise<SaleFormState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const values = readSaleForm(formData);
  const { errors, sale } = validateSale(values);
  if (!sale) return { status: "invalid", errors, values };

  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { status: "refused", message: refusalMessage(auth.reason), values };

  // Copy each catalogue product's category and condition onto the sale: sold
  // products are removed from the shop below, and the reports still need them.
  const catalogue = new Map((await listAdminProducts()).map((product) => [product.id, product]));
  const soldProducts = sale.items.map((item) => (item.productId ? catalogue.get(item.productId) : undefined)).filter(Boolean);

  // One database function saves the sale and its items together and, unless the
  // sale is cancelled, removes the sold products from the catalogue — all or nothing.
  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.rpc("save_sale", {
    p_id: id,
    p_sale: {
      sold_on: sale.soldOn,
      customer_name: sale.customerName ?? null,
      customer_phone: sale.customerPhone ?? null,
      payment_method: sale.paymentMethod,
      status: sale.status,
      delivery_fee: sale.deliveryFee,
      payment_fee: sale.paymentFee,
      discount: sale.discount,
      notes: sale.notes ?? null,
    },
    p_items: sale.items.map((item, position) => ({
      product_id: item.productId ?? null,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      unit_cost: item.unitCost ?? null,
      category: (item.productId && catalogue.get(item.productId)?.categories[0]) ?? null,
      condition: (item.productId && catalogue.get(item.productId)?.condition) ?? null,
      position,
    })),
  });
  if (error) return { status: "refused", message: `Not saved: ${error.message}`, values };

  // The sold products are gone from the catalogue: tidy up their photos (best effort).
  if (sale.status !== "cancelled" && soldProducts.length > 0) {
    const photos = soldProducts.map((product) => storagePath(product?.image?.src)).filter((path): path is string => Boolean(path));
    if (photos.length > 0) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(photos);
    updateTag(PRODUCTS_TAG);
  }

  refresh();
  const removed = sale.status === "cancelled" ? 0 : soldProducts.length;
  redirect(`/admin/finance/sales?saved=${id ? "updated" : "added"}${removed ? `&removed=${removed}` : ""}`);
}

export async function setSaleStatus(saleId: string, status: string): Promise<ActionResult> {
  if (!SALE_STATUSES.includes(status as SaleStatus)) return { ok: false, message: "Choose a valid status." };
  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };
  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.from("sales").update({ status }).eq("id", saleId);
  if (error) return { ok: false, message: `Not changed: ${error.message}` };

  // A sale that is now paid or awaiting payment takes its products out of the shop
  // (e.g. a cancelled sale switched back). Nothing happens for products already removed.
  if (status !== "cancelled") {
    const { data: items } = await supabase.from("sale_items").select("product_id").eq("sale_id", saleId);
    const ids = new Set((items ?? []).map((item) => item.product_id as string | null).filter(Boolean));
    const sold = (await listAdminProducts()).filter((product) => ids.has(product.id));
    if (sold.length > 0) {
      const { error: removeError } = await supabase.rpc("remove_sold_products", { p_sale_id: saleId });
      if (removeError) return { ok: false, message: `Status changed, but the products weren't removed: ${removeError.message}` };
      const photos = sold.map((product) => storagePath(product.image?.src)).filter((path): path is string => Boolean(path));
      if (photos.length > 0) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(photos);
      updateTag(PRODUCTS_TAG);
      refresh();
      return { ok: true, message: `Status updated. ${sold.length === 1 ? "1 product was" : `${sold.length} products were`} removed from the shop.` };
    }
  }
  refresh();
  return { ok: true, message: "Status updated." };
}

export async function deleteSale(saleId: string): Promise<ActionResult> {
  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("sales").delete().eq("id", saleId).select("id");
  if (error) return { ok: false, message: `Not deleted: ${error.message}` };
  if (!data?.length) return { ok: false, message: "That sale no longer exists." };
  refresh();
  return { ok: true, message: "Sale deleted." };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export type ExpenseFormState =
  | { status: "idle" }
  | { status: "invalid"; errors: ExpenseFormErrors; values: ExpenseFormValues }
  | { status: "refused"; message: string; values: ExpenseFormValues }
  | { status: "saved"; message: string };

export async function saveExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const values = readExpenseForm(formData);
  const categories = await listExpenseCategories();
  const { errors, expense } = validateExpense(
    values,
    categories.map((category) => category.key),
  );
  if (!expense) return { status: "invalid", errors, values };

  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { status: "refused", message: refusalMessage(auth.reason), values };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.from("expenses").insert({
    spent_on: expense.spentOn,
    category: expense.category,
    amount: expense.amount,
    description: expense.description ?? null,
    created_by: auth.admin.userId,
  });
  if (error) return { status: "refused", message: `Not saved: ${error.message}`, values };
  refresh();
  return { status: "saved", message: "Expense recorded." };
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("expenses").delete().eq("id", expenseId).select("id");
  if (error) return { ok: false, message: `Not deleted: ${error.message}` };
  if (!data?.length) return { ok: false, message: "That expense no longer exists." };
  refresh();
  return { ok: true, message: "Expense deleted." };
}

// ---------------------------------------------------------------------------
// Custom expense categories
// ---------------------------------------------------------------------------

export type CategoryFormState =
  | { status: "idle" }
  | { status: "error"; message: string; name: string }
  | { status: "added"; message: string };

/** Adds a category of the business's own (e.g. "Market stall fees"). */
export async function addExpenseCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const rawName = String(formData.get("name") ?? "");
  const existing = await listExpenseCategories();
  const result = validateCategoryName(rawName, existing);
  if ("error" in result) return { status: "error", message: result.error, name: rawName };

  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { status: "error", message: refusalMessage(auth.reason), name: rawName };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase
    .from("expense_categories")
    .insert({ key: result.key, name: result.name, created_by: auth.admin.userId });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? "There's already a category with that name." : `Not added: ${error.message}`,
      name: rawName,
    };
  }
  refresh();
  return { status: "added", message: `“${result.name}” added. You can now choose it for expenses.` };
}

/** Deletes a custom category, but only while no expense uses it (history stays intact). */
export async function deleteExpenseCategory(key: string): Promise<ActionResult> {
  if (!key.startsWith(CUSTOM_CATEGORY_PREFIX)) return { ok: false, message: "Built-in categories can't be deleted." };
  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };

  const supabase = await createSessionSupabaseClient();
  const { count, error: countError } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("category", key);
  if (countError) return { ok: false, message: `Not deleted: ${countError.message}` };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Not deleted: ${count === 1 ? "1 expense uses" : `${count} expenses use`} this category. It stays so your history adds up.`,
    };
  }
  const { error } = await supabase.from("expense_categories").delete().eq("key", key);
  if (error) return { ok: false, message: `Not deleted: ${error.message}` };
  refresh();
  return { ok: true, message: "Category deleted." };
}

// ---------------------------------------------------------------------------
// Cost prices
// ---------------------------------------------------------------------------

/** Sets (or, with a blank value, clears) what the business pays per unit for a product. */
export async function saveCostPrice(productId: string, value: string): Promise<ActionResult> {
  const amount = parseMoney(value);
  if (Number.isNaN(amount)) return { ok: false, message: "Enter an amount like 4.50, or leave it blank." };
  const auth = await requireAdmin("finance.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };

  const supabase = await createSessionSupabaseClient();
  const { error } =
    value.trim() === ""
      ? await supabase.from("product_costs").delete().eq("product_id", productId)
      : await supabase.from("product_costs").upsert({ product_id: productId, cost_price: amount, updated_by: auth.admin.userId });
  if (error) return { ok: false, message: `Not saved: ${error.message}` };
  refresh();
  return { ok: true, message: value.trim() === "" ? "Cost price cleared." : "Cost price saved." };
}
