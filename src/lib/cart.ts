/**
 * Pure cart operations. No browser APIs — safe to import anywhere and to test
 * with `node --test`.
 */

import type { CartLine, CartState } from "../types/cart.ts";
import { MAX_LINE_QUANTITY } from "../types/cart.ts";

export const EMPTY_CART: CartState = { version: 1, lines: [] };

export function lineKey(productId: string, size?: string, variantId?: string): string {
  return [productId, size ?? "", variantId ?? ""].join("::");
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

export type NewCartLine = Omit<CartLine, "key" | "quantity"> & { quantity?: number };

/** Add a line, merging with an existing line for the same product + size + variant. */
export function addLine(state: CartState, input: NewCartLine): CartState {
  const key = lineKey(input.productId, input.size, input.variantId);
  const addQuantity = clampQuantity(input.quantity ?? 1);
  const existing = state.lines.find((line) => line.key === key);

  if (existing) {
    return {
      ...state,
      lines: state.lines.map((line) =>
        line.key === key ? { ...line, quantity: clampQuantity(line.quantity + addQuantity) } : line,
      ),
    };
  }
  return { ...state, lines: [...state.lines, { ...input, key, quantity: addQuantity }] };
}

export function setLineQuantity(state: CartState, key: string, quantity: number): CartState {
  if (quantity < 1) return removeLine(state, key);
  return {
    ...state,
    lines: state.lines.map((line) =>
      line.key === key ? { ...line, quantity: clampQuantity(quantity) } : line,
    ),
  };
}

export function removeLine(state: CartState, key: string): CartState {
  return { ...state, lines: state.lines.filter((line) => line.key !== key) };
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const optionalString = (value: unknown) => (isString(value) ? value : undefined);

function sanitiseLine(value: unknown): CartLine | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (!isString(raw.productId) || !isString(raw.name) || !isString(raw.slug)) return undefined;
  if (typeof raw.quantity !== "number" || !Number.isFinite(raw.quantity) || raw.quantity < 1) {
    return undefined;
  }

  const size = optionalString(raw.size);
  const variantId = optionalString(raw.variantId);
  const unitPrice =
    typeof raw.unitPrice === "number" && Number.isFinite(raw.unitPrice) && raw.unitPrice >= 0
      ? raw.unitPrice
      : undefined;

  return {
    key: lineKey(raw.productId, size, variantId),
    productId: raw.productId,
    slug: raw.slug,
    name: raw.name.slice(0, 200),
    imageSrc: optionalString(raw.imageSrc),
    imageAlt: optionalString(raw.imageAlt),
    size,
    variantId,
    variantLabel: optionalString(raw.variantLabel),
    quantity: clampQuantity(raw.quantity),
    unitPrice,
    currency: unitPrice !== undefined ? optionalString(raw.currency) : undefined,
  };
}

/**
 * Parse cart JSON from storage. Malformed, outdated or tampered data is
 * discarded line-by-line rather than crashing the page.
 */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object" || (data as { version?: unknown }).version !== 1) {
      return EMPTY_CART;
    }
    const lines = (data as { lines?: unknown }).lines;
    if (!Array.isArray(lines)) return EMPTY_CART;

    let state: CartState = EMPTY_CART;
    for (const candidate of lines.slice(0, 100)) {
      const line = sanitiseLine(candidate);
      if (line) state = addLine(state, line);
    }
    return state;
  } catch {
    return EMPTY_CART;
  }
}

export function totalQuantity(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Authoritative product facts used to refresh cart snapshots. */
export interface CatalogueFacts {
  id: string;
  slug: string;
  name: string;
  imageSrc?: string;
  imageAlt?: string;
  sizes?: string[];
  price?: number;
  currency?: string;
}

/**
 * Reconcile the stored cart with the current catalogue: refresh names, images
 * and prices, and drop lines whose product or size is no longer offered.
 */
export function reconcileCart(
  state: CartState,
  catalogue: Map<string, CatalogueFacts>,
): { state: CartState; removed: string[] } {
  const removed: string[] = [];
  const lines: CartLine[] = [];

  for (const line of state.lines) {
    const product = catalogue.get(line.productId);
    const sizeStillValid = product && (!line.size || product.sizes?.includes(line.size));
    const sizeRequired = product?.sizes?.length && !line.size;
    if (!product || !sizeStillValid || sizeRequired) {
      removed.push(line.name);
      continue;
    }
    lines.push({
      ...line,
      slug: product.slug,
      name: product.name,
      imageSrc: product.imageSrc,
      imageAlt: product.imageAlt,
      unitPrice: product.price,
      currency: product.price !== undefined ? product.currency : undefined,
    });
  }
  return { state: { ...state, lines }, removed };
}
