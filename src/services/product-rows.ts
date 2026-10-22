/**
 * Conversion between `public.products` rows (supabase/schema.sql) and the
 * app's Product type. Kept free of Supabase imports so it can be unit tested.
 */

import type { ProductFormValues } from "../lib/validation/product.ts";
import {
  CATEGORY_SLUGS,
  type Availability,
  type CategorySlug,
  type Product,
  type ProductCondition,
  type ProductType,
} from "../types/product.ts";

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string | null;
  categories: string[];
  type: ProductType;
  condition: ProductCondition;
  price: number | string | null;
  currency: string | null;
  sizes: string[] | null;
  availability: Availability | null;
  image_url: string | null;
  image_alt: string | null;
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductRowInput = Omit<ProductRow, "id" | "created_at" | "updated_at">;

export const PRODUCT_COLUMNS =
  "id, slug, name, short_description, description, categories, type, condition, price, currency, sizes, availability, image_url, image_alt, active, featured, created_at, updated_at";

export function rowToProduct(row: ProductRow): Product {
  const price = row.price === null ? undefined : Number(row.price);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    description: row.description ?? undefined,
    // Ignore any category the site no longer has rather than failing the whole page.
    categories: row.categories.filter((slug): slug is CategorySlug => CATEGORY_SLUGS.includes(slug as CategorySlug)),
    type: row.type,
    condition: row.condition,
    price: Number.isFinite(price) ? price : undefined,
    currency: row.currency ?? undefined,
    sizes: row.sizes?.length ? row.sizes : undefined,
    availability: row.availability ?? undefined,
    // Photos fill a fixed-ratio frame, so the stored size is nominal.
    image: row.image_url ? { src: row.image_url, alt: row.image_alt ?? row.name, width: 1200, height: 1500 } : undefined,
    active: row.active,
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Row values from validated admin form input. `imageUrl` is the final photo URL (uploaded or kept). */
export function formToRow(values: ProductFormValues, imageUrl: string | undefined): ProductRowInput {
  return {
    slug: values.slug,
    name: values.name,
    short_description: values.shortDescription,
    description: values.description || null,
    categories: values.categories,
    type: values.type as ProductType,
    condition: values.condition as ProductCondition,
    price: values.price ? Math.round(Number(values.price) * 100) / 100 : null,
    currency: values.price ? values.currency : null,
    sizes: values.sizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean),
    availability: (values.availability || null) as Availability | null,
    image_url: imageUrl ?? null,
    image_alt: imageUrl ? values.imageAlt || values.name : null,
    active: values.active,
    featured: values.featured,
  };
}

/** Row values for copying an existing (e.g. sample) product into the database. */
export function productToRow(product: Product): ProductRowInput {
  return {
    slug: product.slug,
    name: product.name,
    short_description: product.shortDescription,
    description: product.description ?? null,
    categories: product.categories,
    type: product.type,
    condition: product.condition,
    price: product.price ?? null,
    currency: product.price !== undefined ? (product.currency ?? null) : null,
    sizes: product.sizes ?? [],
    availability: product.availability ?? null,
    image_url: product.image?.src ?? null,
    image_alt: product.image?.alt ?? null,
    active: product.active,
    featured: Boolean(product.featured),
  };
}
