"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { demoProducts } from "@/data/demo-products";
import { refusalMessage, requireAdmin } from "@/lib/auth/admin";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import {
  IMAGE_TYPES,
  readImageFile,
  readProductForm,
  validateImageFile,
  validateProduct,
  type ProductFormErrors,
  type ProductFormValues,
} from "@/lib/validation/product";
import { formToRow, productToRow } from "@/services/product-rows";
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

/** Public URL of an uploaded photo → its path inside the bucket (undefined if it isn't one of ours). */
function storagePath(url: string | null | undefined): string | undefined {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const index = url?.indexOf(marker) ?? -1;
  return url && index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : undefined;
}

export async function saveProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const values = readProductForm(formData);
  const file = readImageFile(formData);
  const errors = validateProduct(values);
  const fileError = file && validateImageFile(file);
  if (fileError) errors.imageSrc = fileError;
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

  const row = formToRow(values, imageUrl);
  const previous = id
    ? (await supabase.from("products").select("image_url").eq("id", id).maybeSingle()).data
    : null;
  const { error } = id
    ? await supabase.from("products").update(row).eq("id", id)
    : await supabase.from("products").insert(row);

  if (error) {
    if (uploadedPath) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([uploadedPath]);
    if (error.code === "23505") {
      return { status: "invalid", errors: { slug: "Another product already uses this URL slug." }, values };
    }
    return { status: "refused", message: `The product could not be saved: ${error.message}`, values };
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

/** Copies the built-in sample products into an empty database so there is something to edit. */
export async function importSampleProducts(): Promise<AdminActionResult> {
  const auth = await requireAdmin("products.edit");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase
    .from("products")
    .upsert(demoProducts.map(productToRow), { onConflict: "slug", ignoreDuplicates: true });
  if (error) return { ok: false, message: `Not imported: ${error.message}` };

  updateTag(PRODUCTS_TAG);
  return { ok: true, message: `Added ${demoProducts.length} sample products. Edit or delete them any time.` };
}
