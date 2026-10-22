import Image from "next/image";
import { Shirt } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProductImage as ProductImageType } from "@/types/product";

/**
 * Fixed-ratio product image. Falls back to a neutral placeholder when no
 * verified product photograph is available.
 */
export function ProductImage({
  image,
  sizes,
  priority,
  className,
  ratio = "aspect-[4/5]",
  hoverZoom,
}: {
  image?: ProductImageType;
  sizes: string;
  priority?: boolean;
  className?: string;
  ratio?: string;
  hoverZoom?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-cream", ratio, className)}>
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className={cn(
            "object-cover",
            hoverZoom && "transition-transform duration-500 ease-out group-hover:scale-[1.03]",
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
          <Shirt size={32} strokeWidth={1.2} aria-hidden="true" />
          <span className="text-xs tracking-wide">Photo coming soon</span>
        </div>
      )}
    </div>
  );
}
