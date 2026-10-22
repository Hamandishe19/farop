import { formatPrice, isValidPrice } from "@/lib/format";
import type { Availability, Product, ProductCondition } from "@/types/product";

export const conditionLabels: Record<ProductCondition, string> = {
  new: "Brand new",
  preloved: "Preloved",
};

const availabilityLabels: Record<Availability, string> = {
  in_stock: "In stock",
  limited: "Limited availability",
  out_of_stock: "Currently unavailable",
  made_to_order: "Made to order",
};

export function availabilityLabel(availability?: Availability): string | undefined {
  return availability ? availabilityLabels[availability] : undefined;
}

/** Formatted price, or undefined when no confirmed price exists. */
export function displayPrice(product: Pick<Product, "price" | "currency">): string | undefined {
  return isValidPrice(product.price, product.currency)
    ? formatPrice(product.price, product.currency as string)
    : undefined;
}

export function canAddToCart(product: Pick<Product, "active" | "availability">): boolean {
  return product.active && product.availability !== "out_of_stock";
}

/** Serializable subset passed to client cart controls. */
export interface CartProductInput {
  id: string;
  slug: string;
  name: string;
  imageSrc?: string;
  imageAlt?: string;
  sizes?: string[];
  variants?: Array<{ id: string; label: string; price?: number }>;
  price?: number;
  currency?: string;
  available: boolean;
}

export function toCartProductInput(product: Product): CartProductInput {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageSrc: product.image?.src,
    imageAlt: product.image?.alt,
    sizes: product.sizes?.length ? product.sizes : undefined,
    variants: product.variants?.length
      ? product.variants.map(({ id, label, price }) => ({ id, label, price }))
      : undefined,
    price: isValidPrice(product.price, product.currency) ? product.price : undefined,
    currency: isValidPrice(product.price, product.currency) ? product.currency : undefined,
    available: canAddToCart(product),
  };
}
