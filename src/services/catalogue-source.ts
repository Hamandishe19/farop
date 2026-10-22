/**
 * Catalogue data source.
 *
 * UI code never imports product data directly — it calls the async functions
 * in ./products.ts and ./categories.ts, which delegate to the source chosen
 * here: Supabase when it is configured, otherwise the built-in sample data.
 *
 * Categories always come from src/data/categories.ts (the site's four
 * catalogues are fixed); only products live in the database.
 */

import { categories as siteCategories } from "@/data/categories";
import { demoProducts } from "@/data/demo-products";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicSupabaseClient } from "@/lib/supabase/server";
import { PRODUCT_COLUMNS, rowToProduct, type ProductRow } from "@/services/product-rows";
import type { Category, Product } from "@/types/product";

export interface CatalogueSource {
  readonly kind: "demo" | "supabase";
  /** Products visible to the public (Supabase: active ones only, enforced by RLS). */
  listProducts(): Promise<Product[]>;
  listCategories(): Promise<Category[]>;
}

const demoSource: CatalogueSource = {
  kind: "demo",
  async listProducts() {
    return demoProducts;
  },
  async listCategories() {
    return siteCategories;
  },
};

const supabaseSource: CatalogueSource = {
  kind: "supabase",
  async listProducts() {
    const { data, error } = await createPublicSupabaseClient()
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Could not load products: ${error.message}`);
    return (data as ProductRow[]).map(rowToProduct);
  },
  async listCategories() {
    return siteCategories;
  },
};

export function getCatalogueSource(): CatalogueSource {
  return isSupabaseConfigured ? supabaseSource : demoSource;
}
