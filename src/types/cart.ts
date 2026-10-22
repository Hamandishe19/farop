export interface CartLine {
  /** Stable key combining product and selected variant/size. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageSrc?: string;
  imageAlt?: string;
  size?: string;
  variantId?: string;
  variantLabel?: string;
  quantity: number;
  /**
   * Display-only snapshot. Never treated as authoritative — the cart page
   * refreshes it from the catalogue, and a future backend must re-price
   * any order server-side.
   */
  unitPrice?: number;
  currency?: string;
}

export interface CartState {
  version: 1;
  lines: CartLine[];
}

export const MAX_LINE_QUANTITY = 99;
