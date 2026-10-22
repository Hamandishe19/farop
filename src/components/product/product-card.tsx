import Link from "next/link";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductImage } from "@/components/product/product-image";
import { cn } from "@/lib/cn";
import { availabilityLabel, conditionLabels, displayPrice, toCartProductInput } from "@/lib/product-display";
import type { Product } from "@/types/product";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const price = displayPrice(product);
  const availability = availabilityLabel(product.availability);
  const href = `/products/${product.slug}`;

  return (
    <article className="group flex h-full flex-col">
      <Link href={href} className="relative block overflow-hidden rounded-lg" tabIndex={-1} aria-hidden="true">
        <ProductImage
          image={product.image}
          priority={priority}
          hoverZoom
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        />
        <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1 sm:inset-x-3 sm:top-3 sm:gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[0.65rem] sm:tracking-[0.12em]",
              product.condition === "preloved" ? "bg-blush-soft/90 text-brown" : "bg-sage-soft/90 text-sage-deep",
            )}
          >
            {conditionLabels[product.condition]}
          </span>
          {product.isDemo && (
            <span className="rounded-full bg-ivory/85 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-[0.1em] text-muted backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[0.65rem] sm:tracking-[0.12em]">
              Sample
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <h3 className="text-[0.98rem] font-medium leading-snug text-charcoal">
          <Link href={href} className="hover:underline hover:decoration-line hover:underline-offset-4">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{product.shortDescription}</p>

        {(price || availability) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {price && <span className="font-medium text-charcoal">{price}</span>}
            {availability && <span className="text-xs text-sage-deep">{availability}</span>}
          </div>
        )}

        <div className="mt-auto pt-4">
          <AddToCart product={toCartProductInput(product)} />
        </div>
      </div>
    </article>
  );
}
