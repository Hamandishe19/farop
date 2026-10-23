import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminCard, AdminPageFallback, AdminPageHeader } from "@/components/admin/admin-page-header";
import { ExpenseCategories } from "@/components/admin/expense-categories";
import { DeleteExpenseButton, ExpenseForm } from "@/components/admin/expense-form";
import { BarList, DateFilter, SampleDataNotice, formatDate, money } from "@/components/admin/finance-ui";
import { allows, requireAdminPage } from "@/lib/auth/admin";
import { harareToday, readHistoryDates } from "@/lib/finance/analytics";
import { isFinanceDemo, listExpenseCategories, listExpenses } from "@/services/finance";
import { expenseCategoryLabel } from "@/types/finance";

export const metadata: Metadata = { title: "Expenses" };

/**
 * Reads the page address (filters / ids), so it renders inside a loading
 * boundary as Cache Components requires.
 */
export default function ExpensesPage(props: PageProps<"/admin/finance/expenses">) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <ExpensesPageContent {...props} />
    </Suspense>
  );
}

async function ExpensesPageContent({ searchParams }: PageProps<"/admin/finance/expenses">) {
  const admin = await requireAdminPage(["finance.view", "finance.edit"]);
  const params = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="Expenses"
        description="Running costs of the business: delivery, packaging, rent, adverts, airtime, fees and so on."
      />
      <Suspense fallback={<div aria-busy="true" className="h-96 animate-pulse rounded-xl bg-white/60" />}>
        <ExpenseList params={params} canRecord={allows(admin, "finance.edit")} />
      </Suspense>
    </>
  );
}

async function ExpenseList({
  params,
  canRecord,
}: {
  params: Record<string, string | string[] | undefined>;
  canRecord: boolean;
}) {
  await connection();
  const [all, categories] = await Promise.all([listExpenses(), listExpenseCategories()]);
  const label = (key: string) => expenseCategoryLabel(key, categories);
  const usage: Record<string, number> = {};
  for (const expense of all) usage[expense.category] = (usage[expense.category] ?? 0) + 1;
  const today = harareToday(new Date());
  const selection = readHistoryDates(params, today);
  const { range } = selection;
  const shown = all.filter((expense) => expense.spentOn >= range.start && expense.spentOn <= range.end);
  const total = shown.reduce((sum, expense) => sum + expense.amount, 0);
  const totals = new Map<string, number>();
  for (const expense of shown) totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  const byCategory = [...totals.entries()]
    .map(([key, value]) => ({ label: label(key), value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <DateFilter selection={selection} today={today} basePath="/admin/finance/expenses" />
      {isFinanceDemo && <SampleDataNotice />}

      {canRecord && (
        <AdminCard>
          <h2 className="mb-1 text-sm font-medium">Add an expense</h2>
          <p className="mb-4 text-xs text-muted">
            Stock you buy for resale is best entered as each product&apos;s cost price instead, so it isn&apos;t counted twice.
          </p>
          <ExpenseForm today={today} categories={categories} />
        </AdminCard>
      )}

      <AdminCard>
        <h2 className="mb-1 text-sm font-medium">Categories</h2>
        <p className="mb-4 text-xs text-muted">
          The built-in list covers common costs. Add your own for anything else; they appear in the reports straight away.
        </p>
        <ExpenseCategories categories={categories} usage={usage} canRecord={canRecord} />
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <AdminCard>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">By category</h2>
            <p className="text-sm">
              <span className="text-muted">Total </span>
              <span className="font-semibold tabular-nums">{money(total)}</span>
            </p>
          </div>
          <BarList rows={byCategory} emptyText="No expenses in this period." />
        </AdminCard>

        <AdminCard className="p-0">
          <h2 className="border-b border-line px-5 py-4 text-sm font-medium">
            {shown.length} {shown.length === 1 ? "expense" : "expenses"}
          </h2>
          {shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No expenses recorded in this period.</p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
              {shown.map((expense) => (
                <li key={expense.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-charcoal">{expense.description ?? label(expense.category)}</p>
                    <p className="text-xs text-muted">
                      {formatDate(expense.spentOn)} · {label(expense.category)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium tabular-nums">{money(expense.amount)}</span>
                    {canRecord && (
                      <DeleteExpenseButton
                        expenseId={expense.id}
                        label={`${label(expense.category)} on ${formatDate(expense.spentOn)}`}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
