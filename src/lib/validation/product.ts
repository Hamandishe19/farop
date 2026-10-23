import { disallowedCategories, productTypeLabels } from "../../config/product-types.ts";
import {
  CATEGORY_SLUGS,
  PRODUCT_CONDITIONS,
  PRODUCT_TYPES,
  type Availability,
  type CategorySlug,
  type ProductCondition,
  type ProductType,
} from "../../types/product.ts";

export const AVAILABILITY_OPTIONS: Array<{ value: Availability | ""; label: string }> = [
  { value: "", label: "Not shown" },
  { value: "in_stock", label: "In stock" },
  { value: "limited", label: "Limited availability" },
  { value: "made_to_order", label: "Made to order" },
  { value: "out_of_stock", label: "Currently unavailable" },
];

export interface ProductFormValues {
  name: string;
  /** Made from the name (not typed by admins); the saved product may get a -2, -3… suffix. */
  slug: string;
  shortDescription: string;
  description: string;
  categories: CategorySlug[];
  type: ProductType | "";
  condition: ProductCondition | "";
  price: string;
  currency: string;
  sizes: string;
  availability: string;
  imageSrc: string;
  imageAlt: string;
  active: boolean;
  featured: boolean;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** `base`, or `base-2`, `base-3`… — the first one not already taken by another product. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base.slice(0, 74)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function str(formData: FormData, key: string, max = 500): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function readProductForm(formData: FormData): ProductFormValues {
  return {
    name: str(formData, "name", 120),
    slug: slugify(str(formData, "name", 120)),
    shortDescription: str(formData, "shortDescription", 240),
    description: str(formData, "description", 4000),
    categories: formData
      .getAll("categories")
      .filter((value): value is CategorySlug => CATEGORY_SLUGS.includes(value as CategorySlug)),
    type: PRODUCT_TYPES.includes(str(formData, "type", 20) as ProductType) ? (str(formData, "type", 20) as ProductType) : "",
    condition: PRODUCT_CONDITIONS.includes(str(formData, "condition", 20) as ProductCondition)
      ? (str(formData, "condition", 20) as ProductCondition)
      : "",
    price: str(formData, "price", 20),
    currency: str(formData, "currency", 3).toUpperCase(),
    sizes: str(formData, "sizes", 500),
    availability: str(formData, "availability", 20),
    imageSrc: str(formData, "imageSrc", 500),
    imageAlt: str(formData, "imageAlt", 200),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
  };
}

export function validateProduct(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (values.name.length < 2) errors.name = "Enter a product name.";
  if (values.name.length >= 2 && !values.slug) errors.name = "Use some letters or numbers in the name.";
  if (values.shortDescription.length < 10) errors.shortDescription = "Add a short description (10+ characters).";
  if (values.categories.length === 0) errors.categories = "Choose at least one category.";
  if (!values.type) {
    errors.type = "Choose a product type.";
  } else {
    const blocked = disallowedCategories(values.type, values.categories);
    if (blocked.length > 0) {
      errors.type = `${productTypeLabels[values.type]} can't be listed under: ${blocked.join(", ")}.`;
    }
  }
  if (!values.condition) errors.condition = "Choose brand new or preloved.";
  if (values.price) {
    const price = Number(values.price);
    if (!Number.isFinite(price) || price < 0) errors.price = "Enter a valid price, or leave blank.";
    if (!/^[A-Z]{3}$/.test(values.currency)) errors.currency = "Enter a 3-letter currency code (e.g. USD).";
  }
  if (values.availability && !AVAILABILITY_OPTIONS.some((option) => option.value === values.availability)) {
    errors.availability = "Choose a valid option.";
  }
  if (values.imageSrc && !/^(\/|https:\/\/)/.test(values.imageSrc)) {
    errors.imageSrc = "Use a path starting with / or an https:// URL.";
  }
  return errors;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** The uploaded photo, or undefined when none was chosen (an empty file input sends a 0-byte file). */
export function readImageFile(formData: FormData): File | undefined {
  const file = formData.get("imageFile");
  return file instanceof File && file.size > 0 ? file : undefined;
}

export function validateImageFile(file: { type: string; size: number }): string | undefined {
  if (!(file.type in IMAGE_TYPES)) return "Upload a JPG, PNG, WebP or AVIF photo.";
  if (file.size > MAX_IMAGE_BYTES) return "Photos must be 5 MB or smaller.";
  return undefined;
}
