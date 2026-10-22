import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, PackageOpen, Plus } from "lucide-react";
import { AdminCard, AdminPageHeader, formatAdminDate } from "@/components/admin/admin-page-header";
import { ImportSamplesButton } from "@/components/admin/import-samples-button";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { buttonClass } from "@/components/ui/button-styles";
import { productTypeLabels } from "@/config/product-types";
import { requireAdminPage } from "@/lib/auth/admin";
import { can } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { conditionLabels, displayPrice } from "@/lib/product-display";
import { listAdminProducts } from "@/services/admin-products";
import { getCategories } from "@/services/categories";
import type { Product } from "@/types/product";

export const metadata: Metadata = { title: "Products" };

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-sage-soft px-2.5 py-1 text-xs text-sage-deep"
          : "inline-flex rounded-full bg-cream px-2.5 py-1 text-xs text-muted"
      }
    >
      {active ? "Visible" : "Hidden"}
    </span>
  );
}

function Thumb({ product }: { product: Product }) {
  return (
    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-cream">
      {product.image && <Image src={product.image.src} alt="" fill sizes="44px" className="object-cover" />}
    </div>
  );
}

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const [admin, { saved }, products, categories] = await Promise.all([
    requireAdminPage("products.edit"),
    searchParams,
    listAdminProducts(),
    getCategories(),
  ]);
  const canDelete = can(admin.role, "products.delete");
  const categoryName = new Map(categories.map((category) => [category.slug, category.name]));
  const categoriesOf = (product: Product) =>
    product.categories.map((slug) => categoryName.get(slug) ?? slug).join(", ");
  const visible = products.filter((product) => product.active).length;

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${products.length} products · ${visible} visible on the website`}
        action={
          <Link href="/admin/products/new" className={buttonClass({ size: "sm" })}>
            <Plus size={15} aria-hidden="true" />
            New product
          </Link>
        }
      />

      {typeof saved === "string" && saved && (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-lg bg-sage-soft px-4 py-3 text-sm text-charcoal">
          <CheckCircle2 size={16} aria-hidden="true" className="shrink-0 text-sage-deep" />
          Saved “{saved}”. The website has been updated.
        </p>
      )}

      {products.length === 0 ? (
        <AdminCard className="flex flex-col items-center px-6 py-14 text-center">
          <PackageOpen size={32} strokeWidth={1.3} aria-hidden="true" className="text-sage" />
          <h2 className="mt-3 font-display text-2xl text-charcoal">No products yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add your first product, or start from the sample products and edit them into your own.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link href="/admin/products/new" className={buttonClass({ size: "sm" })}>
              <Plus size={15} aria-hidden="true" />
              New product
            </Link>
            {isSupabaseConfigured && <ImportSamplesButton />}
          </div>
        </AdminCard>
      ) : (
        <>
          {/* Phones and small tablets: one card per product. */}
          <ul className="space-y-3 md:hidden">
            {products.map((product) => (
              <li key={product.id}>
                <AdminCard className="p-4">
                  <div className="flex gap-3">
                    <Thumb product={product} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/products/${product.id}/edit`} className="font-medium text-charcoal hover:underline">
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">
                        {categoriesOf(product)} · {conditionLabels[product.condition]}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium tabular-nums">{displayPrice(product) ?? "No price"}</span>
                        <StatusBadge active={product.active} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-line pt-3">
                    <Link href={`/admin/products/${product.id}/edit`} className="rounded-md px-2 py-1 text-xs font-medium hover:bg-cream">
                      Edit<span className="sr-only"> {product.name}</span>
                    </Link>
                    <ProductRowActions id={product.id} name={product.name} active={product.active} canDelete={canDelete} />
                  </div>
                </AdminCard>
              </li>
            ))}
          </ul>

          {/* Tablets and up: table. */}
          <AdminCard className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Product</th>
                  <th scope="col" className="px-3 py-3 font-medium">Categories</th>
                  <th scope="col" className="px-3 py-3 font-medium">Condition</th>
                  <th scope="col" className="px-3 py-3 font-medium">Price</th>
                  <th scope="col" className="px-3 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3 font-medium">Updated</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => (
                  <tr key={product.id} className="align-middle">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb product={product} />
                        <div className="min-w-0">
                          <Link href={`/admin/products/${product.id}/edit`} className="font-medium hover:underline">
                            {product.name}
                          </Link>
                          <p className="text-xs text-muted">
                            {productTypeLabels[product.type]}
                            {product.isDemo && " · sample"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">{categoriesOf(product)}</td>
                    <td className="px-3 py-3 text-muted">{conditionLabels[product.condition]}</td>
                    <td className="px-3 py-3 tabular-nums">{displayPrice(product) ?? <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-3"><StatusBadge active={product.active} /></td>
                    <td className="px-3 py-3 text-xs text-muted">{formatAdminDate(product.updatedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-start justify-end gap-1">
                        <Link href={`/admin/products/${product.id}/edit`} className="rounded-md px-2 py-1 text-xs hover:bg-cream">
                          Edit<span className="sr-only"> {product.name}</span>
                        </Link>
                        <ProductRowActions id={product.id} name={product.name} active={product.active} canDelete={canDelete} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        </>
      )}
    </>
  );
}
