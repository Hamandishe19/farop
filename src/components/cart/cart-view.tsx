"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { CartLineItem } from "@/components/cart/cart-line";
import { Checkout, type OrderSettings } from "@/components/cart/checkout";
import { buttonClass } from "@/components/ui/button-styles";
import { useCart } from "@/hooks/use-cart";
import { reconcileCart, type CatalogueFacts } from "@/lib/cart";
import { formatPrice, pluralise } from "@/lib/format";
import { calculateTotals } from "@/lib/whatsapp";
import { toastStore } from "@/store/toast-store";

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once the client has taken over. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function CartView({
  catalogue,
  businessName,
  orderSettings,
}: {
  catalogue: CatalogueFacts[];
  businessName: string;
  orderSettings: OrderSettings;
}) {
  const hydrated = useHydrated();
  const cart = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const catalogueMap = useMemo(() => new Map(catalogue.map((item) => [item.id, item])), [catalogue]);

  // Refresh stored lines against the current catalogue once the cart is loaded.
  useEffect(() => {
    if (!hydrated) return;
    const { state, removed } = reconcileCart(cart.state, catalogueMap);
    if (JSON.stringify(state) !== JSON.stringify(cart.state)) cart.replace(state);
    if (removed.length) {
      toastStore.show(
        `Some items are no longer available in the selected option and were removed: ${removed.join(", ")}.`,
        undefined,
        9000,
      );
    }
    // Only on hydration / catalogue change — not on every quantity edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, catalogueMap]);

  if (!hydrated) {
    return (
      <div aria-busy="true" aria-label="Loading your cart" className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-cream" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-cream" />
      </div>
    );
  }

  const totals = calculateTotals(cart.lines);

  return (
    <>
      {cart.lines.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white/40 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-sage-deep">
            <ShoppingBag size={24} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="mt-5 font-display text-2xl text-charcoal">Your cart is empty</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Browse the collection and add the pieces you&apos;d like to order.
          </p>
          <Link href="/#categories" className={buttonClass({ className: "mt-7" })}>
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section aria-labelledby="cart-items-heading" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
              <h2 id="cart-items-heading" className="text-sm font-medium text-charcoal">
                {pluralise(totals.totalQuantity, "item")}
              </h2>
              {confirmClear ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Clear all items?</span>
                  <button
                    type="button"
                    onClick={() => {
                      cart.clear();
                      setConfirmClear(false);
                    }}
                    className="rounded-full px-3 py-1.5 font-medium text-danger hover:bg-danger/5"
                  >
                    Yes, clear
                  </button>
                  <button type="button" onClick={() => setConfirmClear(false)} className="rounded-full px-3 py-1.5 hover:bg-cream">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-cream hover:text-charcoal"
                >
                  Clear cart
                </button>
              )}
            </div>

            <ul className="divide-y divide-line">
              {cart.lines.map((line) => (
                <CartLineItem key={line.key} line={line} />
              ))}
            </ul>

            <Link href="/#categories" className="mt-6 inline-flex items-center gap-2 text-sm text-charcoal hover:underline hover:underline-offset-4">
              <ArrowLeft size={15} aria-hidden="true" />
              Continue Shopping
            </Link>
          </section>

          <aside aria-labelledby="summary-heading" className="min-w-0 rounded-xl border border-line bg-white/60 p-4 min-[400px]:p-6 lg:sticky lg:top-24">
            <h2 id="summary-heading" className="font-display text-2xl text-charcoal">
              Summary
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total items</dt>
                <dd className="font-medium tabular-nums">{totals.totalQuantity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Total</dt>
                <dd className="text-right">
                  {totals.subtotal !== undefined && totals.currency ? (
                    <span className="font-medium tabular-nums">{formatPrice(totals.subtotal, totals.currency)}</span>
                  ) : (
                    <span className="text-muted">Confirmed on WhatsApp</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-line pt-6">
              <h3 className="mb-4 text-sm font-medium text-charcoal">Delivery &amp; payment</h3>
              <Checkout lines={cart.lines} businessName={businessName} orderSettings={orderSettings} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
