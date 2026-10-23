import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AdminPageFallback, AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { allows, requireAdminPage } from "@/lib/auth/admin";
import { getAdminProduct } from "@/services/admin-products";
import { getCategories } from "@/services/categories";
import { getCostPrices } from "@/services/finance";

export const metadata: Metadata = { title: "Edit product" };

/**
 * Reads the page address (filters / ids), so it renders inside a loading
 * boundary as Cache Components requires.
 */
export default function EditProductPage(props: PageProps<"/admin/products/[id]/edit">) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <EditProductPageContent {...props} />
    </Suspense>
  );
}

async function EditProductPageContent({ params }: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;
  const admin = await requireAdminPage("products.edit");
  const canRecordFinance = allows(admin, "finance.edit");
  const [product, categories, costs] = await Promise.all([
    getAdminProduct(id),
    getCategories(),
    canRecordFinance ? getCostPrices() : Promise.resolve(undefined),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit: ${product.name}`} description={product.isDemo ? "Sample listing (demonstration data)" : undefined} />
      <ProductForm
        mode="edit"
        productId={product.id}
        costPrice={costs ? { value: costs.has(product.id) ? String(costs.get(product.id)) : "" } : undefined}
        categories={categories.map(({ slug, name }) => ({ slug, name }))}
        initial={{
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          description: product.description ?? "",
          categories: product.categories,
          type: product.type,
          condition: product.condition,
          price: product.price !== undefined ? String(product.price) : "",
          currency: product.currency ?? "",
          sizes: product.sizes?.join(", ") ?? "",
          availability: product.availability ?? "",
          imageSrc: product.image?.src ?? "",
          imageAlt: product.image?.alt ?? "",
          active: product.active,
          featured: Boolean(product.featured),
        }}
      />
    </>
  );
}
