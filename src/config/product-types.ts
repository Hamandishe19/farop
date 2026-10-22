/**
 * Garment types and which ones each catalogue may contain.
 *
 * Business rules:
 *  - Shorts are not sold at all, so there is no "shorts" type.
 *  - Girls: no trousers (no "bottoms" type), so girls' bottoms are not offered.
 *  - Boys: trousers only (the "bottoms" type), no dresses.
 *
 * Edit the labels or the lists below to change what customers can filter by.
 */

import { PRODUCT_TYPES, type CategorySlug, type ProductType } from "../types/product.ts";

export const productTypeLabels: Record<ProductType, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  dresses: "Dresses",
  bodysuits: "Bodysuits",
  sets: "Sets",
  outerwear: "Outerwear",
  accessories: "Hats & accessories",
  shoes: "Shoes",
};

const ALL_TYPES: readonly ProductType[] = PRODUCT_TYPES;

/** Types each catalogue can contain. Catalogues not listed allow every type. */
const allowedTypesByCategory: Partial<Record<CategorySlug, readonly ProductType[]>> = {
  boys: ALL_TYPES.filter((type) => type !== "dresses"),
  girls: ALL_TYPES.filter((type) => type !== "bottoms"),
  shoes: ["shoes"],
};

export function allowedTypesFor(category: CategorySlug): readonly ProductType[] {
  return allowedTypesByCategory[category] ?? ALL_TYPES;
}

/** Single source of truth for whether a product is listed in a catalogue. */
export function belongsInCategory(
  product: { categories: CategorySlug[]; type: ProductType },
  category: CategorySlug,
): boolean {
  return product.categories.includes(category) && allowedTypesFor(category).includes(product.type);
}

/** Categories (if any) that do not allow this product type. */
export function disallowedCategories(type: ProductType, categories: CategorySlug[]): CategorySlug[] {
  return categories.filter((category) => !allowedTypesFor(category).includes(type));
}
