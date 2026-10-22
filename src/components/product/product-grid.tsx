import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { buttonClass } from "@/components/ui/button-styles";
import type { Product } from "@/types/product";

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  if (products.length === 0) return <EmptyCatalogue />;

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function EmptyCatalogue({
  title = "New pieces are on the way",
  message = "There are no products in this category yet. Browse our other collections, or contact us to ask about something specific.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white/40 px-6 py-16 text-center">
      <PackageOpen size={36} strokeWidth={1.2} aria-hidden="true" className="text-sage" />
      <h2 className="mt-4 font-display text-2xl text-charcoal">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/#categories" className={buttonClass()}>
          Browse collections
        </Link>
        <Link href="/contact" className={buttonClass({ variant: "secondary" })}>
          Contact us
        </Link>
      </div>
    </div>
  );
}
