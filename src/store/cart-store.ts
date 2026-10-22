/**
 * Client cart store persisted to localStorage.
 *
 * Only product references, chosen sizes and quantities are stored — no
 * personal information. Browser APIs are touched lazily, so importing this
 * module during server rendering is safe; the server snapshot is always the
 * empty cart, and React re-renders with the stored cart after hydration.
 */

import {
  EMPTY_CART,
  addLine,
  parseStoredCart,
  removeLine,
  setLineQuantity,
  type NewCartLine,
} from "@/lib/cart";
import type { CartState } from "@/types/cart";

const STORAGE_KEY = "farop.cart.v1";

let state: CartState = EMPTY_CART;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    state = EMPTY_CART; // storage blocked (private mode, disabled cookies)
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = parseStoredCart(event.newValue);
    emit();
  });
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: CartState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persisting failed; the cart still works for this page session.
  }
  emit();
}

export const cartStore = {
  subscribe(listener: () => void) {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): CartState {
    load();
    return state;
  },
  getServerSnapshot(): CartState {
    return EMPTY_CART;
  },
  add(line: NewCartLine) {
    load();
    commit(addLine(state, line));
  },
  setQuantity(key: string, quantity: number) {
    load();
    commit(setLineQuantity(state, key, quantity));
  },
  remove(key: string) {
    load();
    commit(removeLine(state, key));
  },
  clear() {
    load();
    commit(EMPTY_CART);
  },
  replace(next: CartState) {
    load();
    commit(next);
  },
};
