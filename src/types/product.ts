export const CATEGORY_SLUGS = ["boys", "girls", "babywear", "shoes"] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** Garment type, used to filter products within a catalogue page. */
export const PRODUCT_TYPES = [
  "tops",
  "bottoms",
  "dresses",
  "bodysuits",
  "sets",
  "outerwear",
  "accessories",
  "shoes",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Whether a piece is brand new or preloved (second-hand). */
export const PRODUCT_CONDITIONS = ["new", "preloved"] as const;

export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export type Availability = "in_stock" | "limited" | "out_of_stock" | "made_to_order";

export interface ProductImage {
  /** Path under /public or an allow-listed remote URL (e.g. Supabase Storage). */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  /** Overrides the product price for this variant, when supplied. */
  price?: number;
  availability?: Availability;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** One or two sentences shown on cards. */
  shortDescription: string;
  /** Longer copy for the product detail page. */
  description?: string;
  /** First entry is the primary category, used for breadcrumbs. */
  categories: CategorySlug[];
  /** Garment type. Must be allowed for every category the product is in (see config/product-types). */
  type: ProductType;
  condition: ProductCondition;
  image?: ProductImage;
  gallery?: ProductImage[];
  /** Only set when the business has supplied a confirmed price. */
  price?: number;
  /** ISO 4217 code, required for a price to be displayed. */
  currency?: string;
  /** Only set when sizes are confirmed. A size must then be chosen before adding to the cart. */
  sizes?: string[];
  variants?: ProductVariant[];
  availability?: Availability;
  sku?: string;
  active: boolean;
  featured?: boolean;
  /** True for sample listings that are not real inventory. */
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Short line used on cards and menus. */
  summary: string;
  /** Introduction shown at the top of the category page. */
  intro: string;
  image?: ProductImage;
  sortOrder: number;
}
