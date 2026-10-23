import "server-only";

import { demoCostPrices, demoCustomCategories, demoFinance } from "@/data/demo-finance";
import { harareToday } from "@/lib/finance/analytics";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/config/payments";
import {
  BUILT_IN_EXPENSE_CATEGORIES,
  builtInExpenseCategoryLabels,
  type Expense,
  type ExpenseCategory,
  type ExpenseCategoryOption,
  type Sale,
  type SaleStatus,
} from "@/types/finance";
import { CATEGORY_SLUGS, PRODUCT_CONDITIONS, type CategorySlug, type ProductCondition } from "@/types/product";

/**
 * Finance data (sales, expenses, cost prices). Read as the signed-in admin,
 * so the database's security rules decide who sees it; callers must also have
 * checked the finance permission. Without Supabase: the sample data in
 * src/data/demo-finance.ts.
 */

export const isFinanceDemo = !isSupabaseConfigured;

interface SaleRow {
  id: string;
  sold_on: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: PaymentMethod;
  status: SaleStatus;
  delivery_fee: number | string;
  payment_fee: number | string | null;
  discount: number | string;
  notes: string | null;
  created_at: string;
  sale_items: Array<{
    product_id: string | null;
    name: string;
    quantity: number;
    unit_price: number | string;
    unit_cost: number | string | null;
    category: string | null;
    condition: string | null;
    position: number;
  }>;
}

const SALE_COLUMNS =
  "id, sold_on, customer_name, customer_phone, payment_method, status, delivery_fee, payment_fee, discount, notes, created_at, sale_items(product_id, name, quantity, unit_price, unit_cost, category, condition, position)";

function rowToSale(row: SaleRow): Sale {
  return {
    id: row.id,
    soldOn: row.sold_on,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    paymentMethod: row.payment_method,
    status: row.status,
    deliveryFee: Number(row.delivery_fee),
    paymentFee: Number(row.payment_fee ?? 0),
    discount: Number(row.discount),
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    items: [...row.sale_items]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        productId: item.product_id ?? undefined,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        unitCost: item.unit_cost === null ? undefined : Number(item.unit_cost),
        category: CATEGORY_SLUGS.includes(item.category as CategorySlug) ? (item.category as CategorySlug) : undefined,
        condition: PRODUCT_CONDITIONS.includes(item.condition as ProductCondition) ? (item.condition as ProductCondition) : undefined,
      })),
  };
}

/** All sales, newest first. */
export async function listSales(): Promise<Sale[]> {
  if (isFinanceDemo) return demoFinance(harareToday(new Date())).sales;
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_COLUMNS)
    .order("sold_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load sales: ${error.message}`);
  return (data as unknown as SaleRow[]).map(rowToSale);
}

export async function getSale(id: string): Promise<Sale | undefined> {
  if (isFinanceDemo) return demoFinance(harareToday(new Date())).sales.find((sale) => sale.id === id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("sales").select(SALE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the sale: ${error.message}`);
  return data ? rowToSale(data as unknown as SaleRow) : undefined;
}

/** All expenses, newest first. */
export async function listExpenses(): Promise<Expense[]> {
  if (isFinanceDemo) return demoFinance(harareToday(new Date())).expenses;
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, spent_on, category, amount, description, created_at")
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load expenses: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    spentOn: row.spent_on as string,
    category: row.category as ExpenseCategory,
    amount: Number(row.amount),
    description: (row.description as string | null) ?? undefined,
    createdAt: row.created_at as string,
  }));
}

/** Cost prices by product id (finance-only: kept out of the public products table). */
export async function getCostPrices(): Promise<Map<string, number>> {
  if (isFinanceDemo) return new Map(Object.entries(demoCostPrices));
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("product_costs").select("product_id, cost_price");
  if (error) throw new Error(`Could not load cost prices: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.product_id as string, Number(row.cost_price)]));
}

/** Built-in categories, then the business's own (alphabetical). */
export async function listExpenseCategories(): Promise<ExpenseCategoryOption[]> {
  const builtIn: ExpenseCategoryOption[] = BUILT_IN_EXPENSE_CATEGORIES.map((key) => ({
    key,
    label: builtInExpenseCategoryLabels[key],
    builtIn: true,
  }));
  let custom: Array<{ key: string; label: string }>;
  if (isFinanceDemo) {
    custom = demoCustomCategories;
  } else {
    const supabase = await createSessionSupabaseClient();
    const { data, error } = await supabase.from("expense_categories").select("key, name");
    if (error) throw new Error(`Could not load expense categories: ${error.message}`);
    custom = (data ?? []).map((row) => ({ key: row.key as string, label: row.name as string }));
  }
  return [
    ...builtIn,
    ...custom
      .map((category) => ({ ...category, builtIn: false }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
}
