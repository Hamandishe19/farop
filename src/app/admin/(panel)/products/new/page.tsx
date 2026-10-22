import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { siteConfig } from "@/config/site";
import { requireAdminPage } from "@/lib/auth/admin";
import { getCategories } from "@/services/categories";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [, categories] = await Promise.all([requireAdminPage("products.edit"), getCategories()]);
  return (
    <>
      <AdminPageHeader title="New product" description="Add a product to the catalogue." />
      <ProductForm
        mode="create"
        categories={categories.map(({ slug, name }) => ({ slug, name }))}
        initial={{
          name: "",
          slug: "",
          shortDescription: "",
          description: "",
          categories: [],
          type: "",
          condition: "",
          price: "",
          currency: siteConfig.currency,
          sizes: "",
          availability: "",
          imageSrc: "",
          imageAlt: "",
          active: true,
          featured: false,
        }}
      />
    </>
  );
}
