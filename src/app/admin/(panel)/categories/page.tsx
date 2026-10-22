import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-page-header";
import { allowedTypesFor, productTypeLabels } from "@/config/product-types";
import { requireAdminPage } from "@/lib/auth/admin";
import { listAdminProducts } from "@/services/admin-products";
import { getCategories } from "@/services/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const [, categories, products] = await Promise.all([requireAdminPage(), getCategories(), listAdminProducts()]);

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="The website's four collections. Choose a product's categories when you add or edit it."
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const inCategory = products.filter((product) => product.categories.includes(category.slug));
          const visible = inCategory.filter((product) => product.active).length;
          return (
            <li key={category.slug}>
              <AdminCard className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl text-charcoal">{category.name}</h2>
                    <p className="text-xs text-muted">
                      {inCategory.length} {inCategory.length === 1 ? "product" : "products"} · {visible} visible
                    </p>
                  </div>
                  <Link
                    href={`/${category.slug}`}
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-muted hover:text-charcoal"
                  >
                    View page <ExternalLink size={12} aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{category.intro}</p>
                <p className="mt-3 text-xs text-muted">
                  <span className="font-medium text-charcoal">Allowed types:</span>{" "}
                  {allowedTypesFor(category.slug).map((type) => productTypeLabels[type]).join(", ")}
                </p>
              </AdminCard>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-xs text-muted">
        Category names and descriptions are part of the website design. Ask your developer if you&apos;d like to
        reword them or add a new collection.
      </p>
    </>
  );
}
