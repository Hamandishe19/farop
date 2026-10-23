import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { AdminCard, AdminPageFallback, AdminPageHeader } from "@/components/admin/admin-page-header";
import { DateFilter, SampleDataNotice, StatTile, formatDate, money } from "@/components/admin/finance-ui";
import { SaleRowActions } from "@/components/admin/sale-row-actions";
import { buttonClass } from "@/components/ui/button-styles";
import { paymentMethodLabels } from "@/config/payments";
import { allows, requireAdminPage } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";
import { harareToday, historyParams, readHistoryDates, saleTotals } from "@/lib/finance/analytics";
import { isFinanceDemo, listSales } from "@/services/finance";
import { SALE_STATUSES, saleStatusLabels, type SaleStatus } from "@/types/finance";

export const metadata: Metadata = { title: "Sales" };

const statusStyles: Record<SaleStatus, string> = {
  paid: "bg-sage-soft text-sage-deep",
  pending: "bg-blush-soft text-brown",
  cancelled: "bg-cream text-muted line-through",
};

/**
 * Reads the page address (filters / ids), so it renders inside a loading
 * boundary as Cache Components requires.
 */
export default function SalesPage(props: PageProps<"/admin/finance/sales">) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <SalesPageContent {...props} />
    </Suspense>
  );
}

async function SalesPageContent({ searchParams }: PageProps<"/admin/finance/sales">) {
  const admin = await requireAdminPage(["finance.view", "finance.edit"]);
  const params = await searchParams;
  const status = SALE_STATUSES.includes(params.status as SaleStatus) ? (params.status as SaleStatus) : undefined;
  const canRecord = allows(admin, "finance.edit");

  return (
    <>
      <AdminPageHeader
        title="Sales"
        description="Orders confirmed on WhatsApp, recorded here so they count in the analytics."
        action={
          canRecord && (
            <Link href="/admin/finance/sales/new" className={buttonClass({ size: "sm" })}>
              <Plus size={15} aria-hidden="true" />
              Record a sale
            </Link>
          )
        }
      />
      {params.saved === "added" || params.saved === "updated" ? (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-lg bg-sage-soft px-4 py-3 text-sm text-charcoal">
          <CheckCircle2 size={16} aria-hidden="true" className="text-sage-deep" />
          {params.saved === "added" ? "Sale recorded." : "Sale updated."}
          {typeof params.removed === "string" &&
            ` ${params.removed === "1" ? "1 sold product was" : `${params.removed} sold products were`} removed from the shop.`}
        </p>
      ) : null}
      <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-xl bg-white/60" />}>
        <SalesList params={params} status={status} canRecord={canRecord} />
      </Suspense>
    </>
  );
}

async function SalesList({
  params,
  status,
  canRecord,
}: {
  params: Record<string, string | string[] | undefined>;
  status?: SaleStatus;
  canRecord: boolean;
}) {
  await connection();
  const all = await listSales();
  const today = harareToday(new Date());
  const selection = readHistoryDates(params, today);
  const { range } = selection;
  const inPeriod = all.filter((sale) => sale.soldOn >= range.start && sale.soldOn <= range.end);
  const shown = status ? inPeriod.filter((sale) => sale.status === status) : inPeriod;
  const sum = (status: SaleStatus) =>
    inPeriod.filter((sale) => sale.status === status).reduce((total, sale) => total + saleTotals(sale).total, 0);

  const statusLink = (value?: SaleStatus) => {
    const params = new URLSearchParams({ ...historyParams(selection), ...(value ? { status: value } : {}) });
    return `/admin/finance/sales?${params}`;
  };

  return (
    <div className="space-y-6">
      <DateFilter selection={selection} today={today} basePath="/admin/finance/sales" extra={status ? { status } : undefined} />
      {isFinanceDemo && <SampleDataNotice />}

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Sales recorded" value={String(inPeriod.length)} />
        <StatTile label="Paid" value={money(sum("paid"))} />
        <StatTile label="Awaiting payment" value={money(sum("pending"))} />
        <StatTile label="Cancelled" value={money(sum("cancelled"))} />
      </dl>

      <nav aria-label="Filter by status">
        <ul className="flex flex-wrap gap-1.5">
          {[undefined, ...SALE_STATUSES].map((value) => (
            <li key={value ?? "all"}>
              <Link
                href={statusLink(value)}
                aria-current={status === value ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-xs transition-colors",
                  status === value ? "bg-brown text-ivory" : "bg-white/70 text-charcoal hover:bg-white",
                )}
              >
                {value ? saleStatusLabels[value] : "All statuses"}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <AdminCard className="p-0">
        {shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No sales here yet.{canRecord && " Record each WhatsApp order once it's confirmed."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((sale) => {
              const totals = saleTotals(sale);
              const label = `sale on ${formatDate(sale.soldOn)}${sale.customerName ? ` to ${sale.customerName}` : ""}`;
              return (
                <li key={sale.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-charcoal">{formatDate(sale.soldOn)}</span>
                      {sale.customerName && <span className="text-charcoal">{sale.customerName}</span>}
                      <span className={cn("rounded-full px-2 py-0.5 text-xs", statusStyles[sale.status])}>
                        {saleStatusLabels[sale.status]}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {sale.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {paymentMethodLabels[sale.paymentMethod]}
                      {sale.deliveryFee > 0 && ` · delivery ${money(sale.deliveryFee)}`}
                      {sale.paymentFee > 0 && ` · EcoCash fee ${money(sale.paymentFee)}`}
                      {sale.discount > 0 && ` · discount ${money(sale.discount)}`}
                      {totals.missingCost && " · some items have no cost price"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums text-charcoal">{money(totals.total)}</span>
                      {!totals.missingCost && (
                        <span className="ml-2 text-xs text-muted">gross profit {money(totals.total - totals.costOfGoods)}</span>
                      )}
                    </p>
                    {canRecord && <SaleRowActions saleId={sale.id} status={sale.status} label={label} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
