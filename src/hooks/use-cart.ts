"use client";

import { useSyncExternalStore } from "react";
import { totalQuantity } from "@/lib/cart";
import { cartStore } from "@/store/cart-store";

export function useCart() {
  const cart = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  return {
    lines: cart.lines,
    state: cart,
    itemCount: totalQuantity(cart),
    add: cartStore.add,
    setQuantity: cartStore.setQuantity,
    remove: cartStore.remove,
    clear: cartStore.clear,
    replace: cartStore.replace,
  };
}
