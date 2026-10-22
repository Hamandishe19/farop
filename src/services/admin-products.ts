import "server-only";

import { demoProducts } from "@/data/demo-products";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import { PRODUCT_COLUMNS, rowToProduct, type ProductRow } from "@/services/product-rows";
import type { Product } from "@/types/product";

/**
 * Admin-side product reads. Unlike the public catalogue these run as the
 * signed-in admin (not cached), so inactive products are included.
 * Callers must have checked requireAdminPage() first.
 */
export async function listAdminProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return demoProducts;
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getAdminProduct(id: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured) return demoProducts.find((product) => product.id === id);
  // Not a UUID → cannot exist (and would make Postgres raise an error).
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the product: ${error.message}`);
  return data ? rowToProduct(data as ProductRow) : undefined;
}
