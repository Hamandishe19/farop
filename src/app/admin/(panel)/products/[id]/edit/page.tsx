import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminProduct } from "@/services/admin-products";
import { getCategories } from "@/services/categories";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;
  const [, product, categories] = await Promise.all([
    requireAdminPage("products.edit"),
    getAdminProduct(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit: ${product.name}`} description={product.isDemo ? "Sample listing (demonstration data)" : undefined} />
      <ProductForm
        mode="edit"
        productId={product.id}
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
