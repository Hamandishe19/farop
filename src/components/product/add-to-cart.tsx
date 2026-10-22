"use client";

import { useId, useState } from "react";
import { ChevronDown, ShoppingBag } from "lucide-react";
import { buttonClass } from "@/components/ui/button-styles";
import { isValidPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { CartProductInput } from "@/lib/product-display";
import { cartStore } from "@/store/cart-store";
import { toastStore } from "@/store/toast-store";

/**
 * Size / variant selection and Add to Cart. When a product has confirmed
 * sizes, one must be chosen before it can be added.
 */
export function AddToCart({
  product,
  layout = "card",
  onSelectionChange,
}: {
  product: CartProductInput;
  layout?: "card" | "detail";
  onSelectionChange?: (selection: { size?: string; variantLabel?: string }) => void;
}) {
  const id = useId();
  const [size, setSize] = useState("");
  const [variantId, setVariantId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const variant = product.variants?.find((option) => option.id === variantId);

  function add() {
    if (product.sizes && !size) {
      setError("Please choose a size.");
      document.getElementById(`${id}-size`)?.focus();
      return;
    }
    if (product.variants && !variant) {
      setError("Please choose an option.");
      document.getElementById(`${id}-variant`)?.focus();
      return;
    }
    setError(null);

    const unitPrice = variant?.price ?? product.price;
    cartStore.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageSrc: product.imageSrc,
      imageAlt: product.imageAlt,
      size: size || undefined,
      variantId: variant?.id,
      variantLabel: variant?.label,
      unitPrice: isValidPrice(unitPrice, product.currency) ? unitPrice : undefined,
      currency: isValidPrice(unitPrice, product.currency) ? product.currency : undefined,
    });

    const detail = [size, variant?.label].filter(Boolean).join(", ");
    toastStore.show(`Added ${product.name}${detail ? ` (${detail})` : ""} to your cart.`, {
      label: "View cart",
      href: "/cart",
    });
  }

  const selectClass = cn(
    "h-11 w-full appearance-none rounded-full border bg-white/70 pl-4 pr-10 text-sm text-charcoal transition-colors focus:border-sage-deep",
    error ? "border-danger/60" : "border-line",
  );
  const chevron = (
    <ChevronDown
      size={15}
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
    />
  );

  if (!product.available) {
    return (
      <p className="rounded-full border border-line px-4 py-2.5 text-center text-sm text-muted">
        Currently unavailable
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", layout === "detail" && "gap-3")}>
      {product.sizes && (
        <div>
          <label htmlFor={`${id}-size`} className={layout === "detail" ? "mb-1.5 block text-sm font-medium" : "sr-only"}>
            Size
          </label>
          <div className="relative">
          <select
            id={`${id}-size`}
            value={size}
            onChange={(event) => {
              setSize(event.target.value);
              setError(null);
              onSelectionChange?.({ size: event.target.value || undefined, variantLabel: variant?.label });
            }}
            aria-invalid={Boolean(error && !size)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={selectClass}
          >
            <option value="">Select size</option>
            {product.sizes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {chevron}
          </div>
        </div>
      )}

      {product.variants && (
        <div>
          <label htmlFor={`${id}-variant`} className={layout === "detail" ? "mb-1.5 block text-sm font-medium" : "sr-only"}>
            Option
          </label>
          <div className="relative">
          <select
            id={`${id}-variant`}
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setError(null);
              const label = product.variants?.find((option) => option.id === event.target.value)?.label;
              onSelectionChange?.({ size: size || undefined, variantLabel: label });
            }}
            aria-invalid={Boolean(error && !variant)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={selectClass}
          >
            <option value="">Select option</option>
            {product.variants.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {chevron}
          </div>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="px-1 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={add}
        className={buttonClass({ size: layout === "detail" ? "lg" : "md", block: true })}
      >
        <ShoppingBag size={16} strokeWidth={1.8} aria-hidden="true" />
        Add to Cart
      </button>
    </div>
  );
}
