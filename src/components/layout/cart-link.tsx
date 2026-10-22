"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/cn";

export function CartLink({ className }: { className?: string }) {
  const { itemCount } = useCart();
  const label = itemCount > 0 ? `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}` : "Cart, empty";

  return (
    <Link
      href="/cart"
      aria-label={label}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-cream",
        className,
      )}
    >
      <ShoppingBag size={20} strokeWidth={1.6} aria-hidden="true" />
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brown px-1 text-[0.65rem] font-semibold leading-none text-ivory tabular-nums"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
