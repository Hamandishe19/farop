import { cacheLife, cacheTag } from "next/cache";
import { belongsInCategory } from "@/config/product-types";
import { getCatalogueSource } from "@/services/catalogue-source";
import type { CategorySlug, Product } from "@/types/product";

/** Cache tag to revalidate after admin product changes (revalidateTag("products")). */
export const PRODUCTS_TAG = "products";

/**
 * Every product the public source returns (cached). With Supabase that is
 * active products only; admin views use services/admin-products instead.
 */
export async function getAllProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  return getCatalogueSource().listProducts();
}

/** Products visible to customers. */
export async function getActiveProducts(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((product) => product.active);
}

export async function getProductsByCategory(slug: CategorySlug): Promise<Product[]> {
  const products = await getActiveProducts();
  // Enforces catalogue rules (e.g. no bottoms in Girls) even if data is mislabelled.
  return products.filter((product) => belongsInCategory(product, slug));
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const products = await getActiveProducts();
  return products.filter((product) => product.featured).slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getActiveProducts();
  return products.find((product) => product.slug === slug);
}

export async function isDemoCatalogue(): Promise<boolean> {
  return getCatalogueSource().kind === "demo";
}
