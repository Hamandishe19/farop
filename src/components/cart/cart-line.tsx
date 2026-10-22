"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Shirt, Trash2 } from "lucide-react";
import { formatPrice, isValidPrice, multiplyPrice } from "@/lib/format";
import { cartStore } from "@/store/cart-store";
import { toastStore } from "@/store/toast-store";
import { MAX_LINE_QUANTITY, type CartLine } from "@/types/cart";

export function CartLineItem({ line }: { line: CartLine }) {
  const priced = isValidPrice(line.unitPrice, line.currency);
  const details = [line.size && `Size: ${line.size}`, line.variantLabel && `Option: ${line.variantLabel}`].filter(Boolean);

  function remove() {
    cartStore.remove(line.key);
    toastStore.show(`Removed ${line.name} from your cart.`);
  }

  return (
    <li className="flex gap-3 py-6 min-[400px]:gap-4 sm:gap-6">
      <Link
        href={`/products/${line.slug}`}
        className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-cream min-[400px]:w-24 sm:w-28"
        tabIndex={-1}
        aria-hidden="true"
      >
        {line.imageSrc ? (
          <Image src={line.imageSrc} alt="" fill sizes="112px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted">
            <Shirt size={24} strokeWidth={1.2} />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-medium text-charcoal">
              <Link href={`/products/${line.slug}`} className="hover:underline hover:underline-offset-4">
                {line.name}
              </Link>
            </h3>
            {details.length > 0 && <p className="mt-1 text-sm text-muted">{details.join(" · ")}</p>}
            {priced && (
              <p className="mt-1 text-sm text-muted">{formatPrice(line.unitPrice as number, line.currency as string)} each</p>
            )}
          </div>
          {priced && (
            <p className="shrink-0 text-sm font-medium tabular-nums text-charcoal">
              {formatPrice(multiplyPrice(line.unitPrice as number, line.quantity), line.currency as string)}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-4">
          <div className="inline-flex items-center rounded-full border border-line bg-white/70" role="group" aria-label={`Quantity for ${line.name}`}>
            <button
              type="button"
              onClick={() => cartStore.setQuantity(line.key, line.quantity - 1)}
              disabled={line.quantity <= 1}
              aria-label={`Decrease quantity of ${line.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal hover:bg-cream disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <output aria-live="polite" className="w-8 text-center text-sm font-medium tabular-nums">
              {line.quantity}
            </output>
            <button
              type="button"
              onClick={() => cartStore.setQuantity(line.key, line.quantity + 1)}
              disabled={line.quantity >= MAX_LINE_QUANTITY}
              aria-label={`Increase quantity of ${line.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal hover:bg-cream disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={remove}
            className="-mr-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm text-muted transition-colors hover:bg-cream hover:text-charcoal"
          >
            <Trash2 size={14} aria-hidden="true" />
            <span className="sr-only min-[360px]:not-sr-only">Remove</span>
            <span className="sr-only"> {line.name}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
