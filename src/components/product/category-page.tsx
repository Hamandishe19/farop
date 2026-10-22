import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { DemoNotice } from "@/components/product/demo-notice";
import { ProductCard } from "@/components/product/product-card";
import { EmptyCatalogue } from "@/components/product/product-grid";
import { ProductTypeFilter } from "@/components/product/product-type-filter";
import { allowedTypesFor, productTypeLabels } from "@/config/product-types";
import { pluralise } from "@/lib/format";
import { getCategory } from "@/services/categories";
import { getProductsByCategory } from "@/services/products";
import type { CategorySlug } from "@/types/product";

export async function categoryMetadata(slug: CategorySlug): Promise<Metadata> {
  const category = await getCategory(slug);
  if (!category) return {};
  return { title: category.name, description: category.intro };
}

/** Shared template for the category routes. Content comes from the catalogue services. */
export async function CategoryPage({ slug }: { slug: CategorySlug }) {
  const [category, products] = await Promise.all([getCategory(slug), getProductsByCategory(slug)]);
  if (!category) notFound();

  // Only types allowed in this catalogue (e.g. no bottoms for girls) that currently have products.
  const typeOptions = allowedTypesFor(slug)
    .filter((type) => products.some((product) => product.type === type))
    .map((type) => ({ value: type, label: productTypeLabels[type] }));

  return (
    <>
      <section className="border-b border-line bg-cream/50">
        <Container className="py-10 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-charcoal">Home</Link>
              </li>
              <li aria-hidden="true"><ChevronRight size={12} /></li>
              <li aria-current="page" className="text-charcoal">{category.name}</li>
            </ol>
          </nav>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow mb-3">Collection</p>
              <h1 className="font-display text-4xl tracking-tight text-charcoal sm:text-5xl">{category.name}</h1>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{category.intro}</p>
            </div>
            <p className="text-sm text-muted">{pluralise(products.length, "piece")}</p>
          </div>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        {products.length === 0 ? (
          <EmptyCatalogue />
        ) : (
          <>
            <div className="mb-8">
              <DemoNotice />
            </div>
            <ProductTypeFilter
              options={typeOptions}
              items={products.map((product, index) => ({
                id: product.id,
                type: product.type,
                condition: product.condition,
                node: <ProductCard product={product} priority={index < 4} />,
              }))}
            />
          </>
        )}
      </Container>
    </>
  );
}
