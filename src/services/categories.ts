import { cacheLife, cacheTag } from "next/cache";
import { getCatalogueSource } from "@/services/catalogue-source";
import type { Category, CategorySlug } from "@/types/product";

export const CATEGORIES_TAG = "categories";

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATEGORIES_TAG);
  const categories = await getCatalogueSource().listCategories();
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategory(slug: CategorySlug): Promise<Category | undefined> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug);
}
