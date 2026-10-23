import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TriangleAlert } from "lucide-react";
import { AdminCard, AdminPageFallback, AdminPageHeader } from "@/components/admin/admin-page-header";
import { BarList, ChangeBadge, DateFilter, SampleDataNotice, StatTile, money } from "@/components/admin/finance-ui";
import { TrendChart } from "@/components/admin/trend-chart";
import { paymentMethodLabels } from "@/config/payments";
import { siteConfig } from "@/config/site";
import { requireAdminPage } from "@/lib/auth/admin";
import { change, computeAnalytics, harareToday, historyParams, readHistoryDates, type ProductFacts } from "@/lib/finance/analytics";
import { conditionLabels } from "@/lib/product-display";
import { listAdminProducts } from "@/services/admin-products";
import { getCategories } from "@/services/categories";
import { isFinanceDemo, listExpenseCategories, listExpenses, listSales } from "@/services/finance";
import { expenseCategoryLabel } from "@/types/finance";

export const metadata: Metadata = { title: "Business analytics" };

/**
 * Reads the page address (filters / ids), so it renders inside a loading
 * boundary as Cache Components requires.
 */
export default function FinanceAnalyticsPage(props: PageProps<"/admin/finance">) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <FinanceAnalyticsPageContent {...props} />
    </Suspense>
  );
}

async function FinanceAnalyticsPageContent({ searchParams }: PageProps<"/admin/finance">) {
  await requireAdminPage("finance.view");
  const params = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="Business analytics"
        description="Revenue, costs and profit from the sales and expenses recorded in the admin."
      />
      <Suspense fallback={<div aria-busy="true" aria-label="Loading figures" className="h-[60vh] animate-pulse rounded-xl bg-white/60" />}>
        <Report params={params} />
      </Suspense>
    </>
  );
}

async function Report({ params }: { params: Record<string, string | string[] | undefined> }) {
  await connection(); // "Today" is read per request.
  const [sales, expenses, products, categories, expenseCategories] = await Promise.all([
    listSales(),
    listExpenses(),
    listAdminProducts(),
    getCategories(),
    listExpenseCategories(),
  ]);
  const expenseLabel = (key: string) => expenseCategoryLabel(key, expenseCategories);
  const today = harareToday(new Date());
  const selection = readHistoryDates(params, today);
  const { range, previous } = selection;
  const keep = new URLSearchParams(historyParams(selection)).toString();
  const facts = new Map<string, ProductFacts>(
    products.map((product) => [product.id, { categories: product.categories, condition: product.condition }]),
  );
  const report = computeAnalytics({ sales, expenses, products: facts }, range);
  const before = computeAnalytics({ sales, expenses, products: facts }, previous);
  const categoryName = new Map<string, string>(categories.map((category) => [category.slug, category.name]));
  const itemSales = report.revenue - report.deliveryFees - report.paymentFees + report.discounts;
  const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

  return (
    <div className="space-y-6">
      <DateFilter selection={selection} today={today} basePath="/admin/finance" />
      {isFinanceDemo && <SampleDataNotice />}

      {/* Hero: the one number this page leads with. */}
      <AdminCard className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Net profit</p>
          <p className={`mt-1 text-5xl font-semibold tracking-tight ${report.netProfit < 0 ? "text-danger" : "text-charcoal"}`}>
            {money(report.netProfit)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {report.netMargin === null ? "No paid sales yet in this period." : `${report.netMargin}% of revenue kept after all costs`}
          </p>
        </div>
        <ChangeBadge value={change(report.netProfit, before.netProfit)} />
      </AdminCard>

      {report.ordersMissingCost > 0 && (
        <p className="flex items-start gap-2 rounded-lg bg-blush-soft px-4 py-3 text-sm text-charcoal">
          <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          <span>
            {report.ordersMissingCost === 1 ? "1 paid sale includes" : `${report.ordersMissingCost} paid sales include`} items without a
            cost price, so profit is shown higher than it really is. Add cost prices on the products (or on the sale).
          </span>
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Revenue" value={money(report.revenue)}>
          <ChangeBadge value={change(report.revenue, before.revenue)} />
        </StatTile>
        <StatTile label="Gross profit" value={money(report.grossProfit)} note={`${percent(report.grossMargin)} margin after cost of goods`} />
        <StatTile label="Expenses" value={money(report.expenses)}>
          <ChangeBadge value={change(report.expenses, before.expenses)} upIsGood={false} />
        </StatTile>
        <StatTile label="Cost of goods sold" value={money(report.costOfGoods)} note="What the items sold cost you" />
        <StatTile label="Paid orders" value={String(report.orders)} note={`${report.units} items sold`}>
          <ChangeBadge value={change(report.orders, before.orders)} />
        </StatTile>
        <StatTile label="Average order" value={report.averageOrderValue === null ? "—" : money(report.averageOrderValue)} />
        <StatTile
          label="Still to be paid"
          value={money(report.outstanding)}
          note={report.pendingOrders === 1 ? "1 order awaiting payment" : `${report.pendingOrders} orders awaiting payment`}
        />
        <StatTile label="Cancelled orders" value={String(report.cancelledOrders)} />
      </dl>

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">Revenue, costs and profit</h2>
          <p className="text-xs text-muted">
            By {report.bucket} · costs = cost of goods + expenses
          </p>
        </div>
        <TrendChart
          currency={siteConfig.currency}
          points={report.series.map(({ label, revenue, costs, profit }) => ({ label, revenue, costs, profit }))}
        />
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard className="p-0">
          <h2 className="border-b border-line px-5 py-4 text-sm font-medium">Profit &amp; loss</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              <PnlRow label="Item sales" value={itemSales} />
              <PnlRow label="Delivery fees charged" value={report.deliveryFees} />
              <PnlRow label="EcoCash fees charged" value={report.paymentFees} />
              <PnlRow label="Discounts given" value={-report.discounts} />
              <PnlRow label="Revenue" value={report.revenue} strong />
              <PnlRow label="Cost of goods sold" value={-report.costOfGoods} />
              <PnlRow label="Gross profit" value={report.grossProfit} strong note={percent(report.grossMargin)} />
              {report.expensesByCategory.map((row) => (
                <PnlRow key={row.key} label={expenseLabel(row.key)} value={-row.amount} indent />
              ))}
              <PnlRow label="Total expenses" value={-report.expenses} />
              <PnlRow label="Net profit" value={report.netProfit} strong total note={percent(report.netMargin)} />
            </tbody>
          </table>
        </AdminCard>

        <AdminCard>
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">Where the money goes</h2>
            <Link href={`/admin/finance/expenses?${keep}`} className="text-xs text-muted hover:text-charcoal">
              Expenses
            </Link>
          </div>
          <BarList
            rows={[
              { label: "Cost of goods sold", value: report.costOfGoods },
              ...report.expensesByCategory.map((row) => ({ label: expenseLabel(row.key), value: row.amount })),
            ]}
            emptyText="No costs recorded in this period."
          />
        </AdminCard>
      </div>

      <AdminCard className="p-0">
        <div className="flex items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <h2 className="text-sm font-medium">Best-selling products</h2>
          <Link href={`/admin/finance/sales?${keep}`} className="text-xs text-muted hover:text-charcoal">
            All sales
          </Link>
        </div>
        {report.topProducts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No paid sales in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Product</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Sold</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Revenue</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Profit</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.topProducts.map((row) => (
                  <tr key={row.name}>
                    <th scope="row" className="px-5 py-2.5 font-normal text-charcoal">{row.name}</th>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.units}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(row.revenue)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.profit === null ? <span className="text-muted">No cost price</span> : money(row.profit)}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {row.profit === null || row.revenue === 0 ? "—" : `${Math.round((row.profit / row.revenue) * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard>
          <h2 className="mb-4 text-sm font-medium">Sales by category</h2>
          <BarList
            rows={report.byCategory.map((row) => ({ label: categoryName.get(row.key) ?? "Other / not in catalogue", value: row.revenue }))}
          />
          <p className="mt-3 text-xs text-muted">Each item counts once, under its main category.</p>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-medium">Brand new vs preloved</h2>
          <BarList
            rows={report.byCondition.map((row) => ({
              label: row.key === "unknown" ? "Not in catalogue" : conditionLabels[row.key],
              value: row.revenue,
              detail: `profit ${money(row.profit)}`,
            }))}
          />
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-medium">Payment methods</h2>
          <BarList
            rows={report.byPayment.map((row) => ({
              label: paymentMethodLabels[row.key],
              value: row.revenue,
              detail: `${row.orders} ${row.orders === 1 ? "order" : "orders"}`,
            }))}
          />
        </AdminCard>
      </div>
    </div>
  );
}

function PnlRow({
  label,
  value,
  strong,
  total,
  indent,
  note,
}: {
  label: string;
  value: number;
  strong?: boolean;
  total?: boolean;
  indent?: boolean;
  note?: string;
}) {
  return (
    <tr className={total ? "bg-cream/60" : undefined}>
      <th scope="row" className={`px-5 py-2.5 text-left ${strong ? "font-medium text-charcoal" : "font-normal text-muted"} ${indent ? "pl-9 text-xs" : ""}`}>
        {label}
      </th>
      <td className="px-3 py-2.5 text-right text-xs text-muted">{note}</td>
      <td className={`px-5 py-2.5 text-right tabular-nums ${strong ? "font-semibold" : ""} ${value < 0 && total ? "text-danger" : "text-charcoal"} ${indent ? "text-xs" : ""}`}>
        {money(value)}
      </td>
    </tr>
  );
}
