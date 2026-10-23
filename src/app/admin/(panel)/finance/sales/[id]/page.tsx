import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AdminPageFallback, AdminPageHeader } from "@/components/admin/admin-page-header";
import { formatDate } from "@/components/admin/finance-ui";
import { SaleFormLoader } from "@/components/admin/sale-form-loader";
import { requireAdminPage } from "@/lib/auth/admin";
import { saleToForm } from "@/lib/validation/finance";
import { getSale } from "@/services/finance";

export const metadata: Metadata = { title: "Edit sale" };

/**
 * Reads the page address (filters / ids), so it renders inside a loading
 * boundary as Cache Components requires.
 */
export default function EditSalePage(props: PageProps<"/admin/finance/sales/[id]">) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <EditSalePageContent {...props} />
    </Suspense>
  );
}

async function EditSalePageContent({ params }: PageProps<"/admin/finance/sales/[id]">) {
  const { id } = await params;
  await requireAdminPage("finance.edit");
  await connection(); // Sample sales are dated relative to today.
  const sale = await getSale(id);
  if (!sale) notFound();

  return (
    <>
      <AdminPageHeader
        title="Edit sale"
        description={`${formatDate(sale.soldOn)}${sale.customerName ? ` · ${sale.customerName}` : ""}`}
      />
      <SaleFormLoader initial={saleToForm(sale)} saleId={sale.id} />
    </>
  );
}
