"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { allows, refusalMessage, requireAdmin } from "@/lib/auth/admin";
import { PRODUCT_IMAGES_BUCKET, storagePath } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import {
  IMAGE_TYPES,
  readImageFile,
  readProductForm,
  uniqueSlug,
  validateImageFile,
  validateProduct,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/validation/product";
import { parseMoney } from "@/lib/validation/finance";
import { formToRow } from "@/services/product-rows";
import { PRODUCTS_TAG } from "@/services/products";

/**
 * Admin mutations. Each one validates input, then checks on the server that
 * the signed-in user is an admin whose role allows it (src/lib/auth/roles.ts)
 * before doing anything. Row Level Security in Supabase enforces the same
 * rules again on every write.
 */

export type AdminActionResult = { ok: true; message: string } | { ok: false; message: string };

export type ProductFormState =
  | { status: "idle" }
  | { status: "invalid"; errors: ProductFormErrors; values: ProductFormValues }
  | { status: "refused"; message: string; values: ProductFormValues };

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------


export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const values = readProductForm(formData);
  const file = readImageFile(formData);
  const errors = validateProduct(values);
  const fileError = file && validateImageFile(file);
  if (fileError) errors.imageSrc = fileError;
  const costField = formData.get("costPrice");
  if (typeof costField === "string" && Number.isNaN(parseMoney(costField))) {
    return { status: "refused", message: "Cost price must be an amount like 4.50, or blank.", values };
  }
  if (Object.keys(errors).length > 0) return { status: "invalid", errors, values };

  const auth = await requireAdmin("products.edit");
  if (!auth.ok) return { status: "refused", message: refusalMessage(auth.reason), values };

  const supabase = await createSessionSupabaseClient();

  let imageUrl = values.imageSrc || undefined;
  let uploadedPath: string | undefined;
  if (file) {
    uploadedPath = `${values.slug}-${crypto.randomUUID().slice(0, 8)}.${IMAGE_TYPES[file.type]}`;
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(uploadedPath, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) return { status: "refused", message: `The photo could not be uploaded: ${error.message}`, values };
    imageUrl = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
  }

  const previous = id
    ? (await supabase.from("products").select("image_url, slug").eq("id", id).maybeSingle()).data
    : null;
  // The web address: kept as it is for an existing product (so shared links keep
  // working); made from the name for a new one, with -2, -3… if already taken.
  let slug = previous?.slug as string | undefined;
  if (!slug) {
    const { data: similar } = await supabase.from("products").select("slug").like("slug", `${values.slug}%`);
    slug = uniqueSlug(values.slug, new Set((similar ?? []).map((row) => row.slug as string)));
  }
  const row = { ...formToRow(values, imageUrl), slug };
  const { data: saved, error } = id
    ? await supabase.from("products").update(row).eq("id", id).select("id").single()
    : await supabase.from("products").insert(row).select("id").single();

  if (error) {
    if (uploadedPath) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([uploadedPath]);
    if (error.code === "23505") {
      return { status: "refused", message: "Another product with the same name was saved at the same moment. Please save again.", values };
    }
    return { status: "refused", message: `The product could not be saved: ${error.message}`, values };
  }

  // Cost price lives in its own finance-only table; only saved by admins who may record finances.
  if (typeof costField === "string" && saved && allows(auth.admin, "finance.edit")) {
    const cost = parseMoney(costField);
    if (!Number.isNaN(cost)) {
      await (costField.trim() === ""
        ? supabase.from("product_costs").delete().eq("product_id", saved.id)
        : supabase.from("product_costs").upsert({ product_id: saved.id, cost_price: cost, updated_by: auth.admin.userId }));
    }
  }

  // Replaced or removed photo: tidy up the old file (best effort).
  const oldPath = storagePath(previous?.image_url);
  if (oldPath && previous?.image_url !== imageUrl) {
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([oldPath]);
  }

  updateTag(PRODUCTS_TAG);
  redirect(`/admin/products?saved=${encodeURIComponent(values.name)}`);
}

export async function setProductActive(productId: string, active: boolean): Promise<AdminActionResult> {
  const auth = await requireAdmin("products.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.from("products").update({ active }).eq("id", productId);
  if (error) return { ok: false, message: `Not saved: ${error.message}` };

  updateTag(PRODUCTS_TAG);
  return { ok: true, message: active ? "Now visible on the website." : "Hidden from the website." };
}

export async function deleteProduct(productId: string): Promise<AdminActionResult> {
  const auth = await requireAdmin("products.delete");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };

  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("products").delete().eq("id", productId).select("image_url");
  if (error) return { ok: false, message: `Not deleted: ${error.message}` };
  if (!data?.length) return { ok: false, message: "That product no longer exists." };

  const path = storagePath(data[0].image_url);
  if (path) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);

  updateTag(PRODUCTS_TAG);
  return { ok: true, message: "Deleted." };
}
