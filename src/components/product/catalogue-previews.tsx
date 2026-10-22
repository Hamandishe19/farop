import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { belongsInCategory } from "@/config/product-types";
import { pluralise } from "@/lib/format";
import type { Category, Product } from "@/types/product";

const PREVIEW_COUNT = 4;

/**
 * One row per catalogue: its name, a "View all" link to the category page,
 * and a few of its products. Catalogues without products are left out.
 */
export function CataloguePreviews({ categories, products }: { categories: Category[]; products: Product[] }) {
  const rows = categories
    .map((category) => ({
      category,
      items: products.filter((product) => belongsInCategory(product, category.slug)),
    }))
    .filter((row) => row.items.length > 0);

  return (
    <div className="space-y-10 sm:space-y-14">
      {rows.map(({ category, items }) => (
        <section key={category.slug} aria-labelledby={`catalogue-${category.slug}`}>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <h3 id={`catalogue-${category.slug}`} className="font-display text-2xl text-charcoal">
                <Link href={`/${category.slug}`} className="hover:underline hover:decoration-line hover:underline-offset-4">
                  {category.name}
                </Link>
              </h3>
              <p className="mt-0.5 text-sm text-muted">
                {category.summary} · {pluralise(items.length, "piece")}
              </p>
            </div>
            <Link
              href={`/${category.slug}`}
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brown hover:text-brown-deep"
            >
              View all<span className="sr-only"> {category.name}</span>
              <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Phones: a swipeable row. Larger screens: a four-column grid. */}
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
            {items.slice(0, PREVIEW_COUNT).map((product) => (
              <li key={product.id} className="w-[42%] shrink-0 snap-start sm:w-auto">
                <Link href={`/products/${product.slug}`} className="group block">
                  <ProductImage
                    image={product.image}
                    hoverZoom
                    className="rounded-lg"
                    sizes="(min-width: 1280px) 300px, (min-width: 640px) 25vw, 42vw"
                  />
                  <p className="mt-3 text-sm font-medium text-charcoal group-hover:underline group-hover:underline-offset-4">
                    {product.name}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
