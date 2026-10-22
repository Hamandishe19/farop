import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminCard, AdminPageHeader, formatAdminDate } from "@/components/admin/admin-page-header";
import { ImportSamplesButton } from "@/components/admin/import-samples-button";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { buttonClass } from "@/components/ui/button-styles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireAdminPage } from "@/lib/auth/admin";
import { roleLabels } from "@/lib/auth/roles";
import { listAdminProducts } from "@/services/admin-products";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin/dashboard">) {
  const [admin, products, settings, { password }] = await Promise.all([
    requireAdminPage(),
    listAdminProducts(),
    getSettings(),
    searchParams,
  ]);
  const visible = products.filter((product) => product.active).length;
  const preloved = products.filter((product) => product.condition === "preloved").length;
  const unpriced = products.filter((product) => product.price === undefined).length;
  const recent = products.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  const stats = [
    { label: "Products", value: products.length },
    { label: "Visible on the website", value: visible },
    { label: "Hidden", value: products.length - visible },
    { label: "Preloved", value: preloved },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`${admin.preview ? "Previewing" : `Welcome${admin.name ? `, ${admin.name}` : ""}`} as ${roleLabels[admin.role].toLowerCase()} · ${isSupabaseConfigured ? "Live catalogue" : "Sample catalogue"}`}
        action={
          <Link href="/admin/products/new" className={buttonClass({ size: "sm" })}>
            <Plus size={15} aria-hidden="true" />
            New product
          </Link>
        }
      />

      {password === "updated" && (
        <p role="status" className="mb-5 rounded-lg bg-sage-soft px-4 py-3 text-sm text-charcoal">
          Your new password has been saved.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <AdminCard key={stat.label} className="p-4 sm:p-5">
            <dt className="text-xs text-muted sm:text-sm">{stat.label}</dt>
            <dd className="mt-1.5 font-display text-3xl tabular-nums text-charcoal sm:text-4xl">{stat.value}</dd>
          </AdminCard>
        ))}
      </dl>

      {unpriced > 0 && (
        <p className="mt-4 rounded-lg bg-blush-soft px-4 py-3 text-sm text-charcoal">
          {unpriced === 1 ? "1 product has" : `${unpriced} products have`} no price, so customers won&apos;t see one.{" "}
          <Link href="/admin/products" className="underline underline-offset-4">Review products</Link>
        </p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <AdminCard className="p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-medium">Recently updated products</h2>
            <Link href="/admin/products" className="text-xs text-muted hover:text-charcoal">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <p className="text-sm text-muted">No products yet.</p>
              {isSupabaseConfigured && <ImportSamplesButton />}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <Link href={`/admin/products/${product.id}/edit`} className="truncate hover:underline">
                    {product.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted">{formatAdminDate(product.updatedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="text-sm font-medium">Orders &amp; enquiries</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Customers place orders and send enquiries on WhatsApp, so they arrive in the business WhatsApp chat —
            not here. Each order lists the items, total, payment method (cash on delivery or EcoCash) and delivery
            address.
          </p>
          {settings.whatsapp && (
            <a
              href={`https://wa.me/${settings.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: "whatsapp", size: "sm", className: "mt-4" })}
            >
              <WhatsAppIcon size={16} />
              Open WhatsApp
            </a>
          )}
        </AdminCard>
      </div>
    </>
  );
}
