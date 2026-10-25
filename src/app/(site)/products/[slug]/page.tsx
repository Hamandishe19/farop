import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { ProductPurchasePanel } from "@/components/product/product-enquiry";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductImage } from "@/components/product/product-image";
import { siteConfig } from "@/config/site";
import { availabilityLabel, conditionLabels, displayPrice, toCartProductInput } from "@/lib/product-display";
import { getCategories } from "@/services/categories";
import { getActiveProducts, getProductBySlug, getProductsByCategory } from "@/services/products";
import { getSettings } from "@/services/settings";

export async function generateStaticParams() {
  const products = await getActiveProducts();
  // Cache Components needs at least one entry. With no products yet (a new
  // shop), a placeholder lets the build check the page; it renders "not found".
  // Products added later are rendered on first visit.
  if (products.length === 0) return [{ slug: "__placeholder__" }];
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: product.image ? { images: [{ url: product.image.src, alt: product.image.alt }] } : undefined,
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  const primary = categories.find((category) => category.slug === product.categories[0]);
  const related = primary
    ? (await getProductsByCategory(primary.slug)).filter((item) => item.id !== product.id).slice(0, 4)
    : [];
  const price = displayPrice(product);
  const availability = availabilityLabel(product.availability);
  const productUrl = siteConfig.url ? new URL(`/products/${product.slug}`, siteConfig.url).toString() : undefined;
  const gallery = product.gallery?.length ? product.gallery : [];

  return (
    <>
      <Container className="py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-charcoal">Home</Link></li>
            {primary && (
              <>
                <li aria-hidden="true"><ChevronRight size={12} /></li>
                <li><Link href={`/${primary.slug}`} className="hover:text-charcoal">{primary.name}</Link></li>
              </>
            )}
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li aria-current="page" className="text-charcoal">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="space-y-4">
            <ProductImage image={product.image} priority className="rounded-xl" sizes="(min-width: 1024px) 50vw, 100vw" />
            {gallery.length > 0 && (
              <ul className="grid grid-cols-3 gap-4">
                {gallery.map((image) => (
                  <li key={image.src}>
                    <ProductImage image={image} className="rounded-lg" sizes="(min-width: 1024px) 16vw, 33vw" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 flex flex-wrap gap-2">
              <p
                className={
                  product.condition === "preloved"
                    ? "inline-flex rounded-full bg-blush-soft px-3 py-1 text-xs font-medium text-brown"
                    : "inline-flex rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-sage-deep"
                }
              >
                {conditionLabels[product.condition]}
              </p>
              {product.isDemo && (
                <p className="inline-flex rounded-full bg-sage-soft px-3 py-1 text-xs font-medium text-sage-deep">
                  Sample listing
                </p>
              )}
            </div>
            <h1 className="font-display text-4xl leading-tight tracking-tight text-charcoal sm:text-[2.75rem]">
              {product.name}
            </h1>
            {(price || availability) && (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {price && <p className="text-xl text-charcoal">{price}</p>}
                {availability && <p className="text-sm text-sage-deep">{availability}</p>}
              </div>
            )}
            <p className="mt-5 text-base leading-relaxed text-muted">{product.description ?? product.shortDescription}</p>

            <div className="mt-8 border-t border-line pt-8">
              <ProductPurchasePanel
                product={toCartProductInput(product)}
                whatsappNumber={settings.whatsapp}
                productUrl={productUrl}
              />
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted">
              {price
                ? "Prices are confirmed with your order."
                : "We'll confirm the price when you order."}{" "}
              Add this piece to your cart and place your order on WhatsApp, or{" "}
              <Link href="/contact" className="underline underline-offset-4 hover:text-charcoal">
                contact us
              </Link>{" "}
              with any questions.
            </p>
          </div>
        </div>
      </Container>

      {related.length > 0 && primary && (
        <section className="border-t border-line pt-14">
          <Container>
            <h2 className="mb-8 font-display text-3xl tracking-tight text-charcoal">More from {primary.name}</h2>
            <ProductGrid products={related} />
          </Container>
        </section>
      )}
    </>
  );
}
