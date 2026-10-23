/**
 * Business analytics from recorded sales and expenses. Pure functions (no
 * I/O, no clock — "today" is passed in) so every figure can be unit tested.
 *
 * Definitions used throughout the admin:
 *   Sale total     = items (quantity × price) − discount + delivery fee + EcoCash fee
 *   Revenue        = total of PAID sales (pending = money still owed, not revenue)
 *   Cost of goods  = quantity × cost price recorded on each item sold
 *   Gross profit   = revenue − cost of goods
 *   Net profit     = gross profit − expenses
 */

import type { PaymentMethod } from "../../config/payments.ts";
import type { CategorySlug, ProductCondition } from "../../types/product.ts";
import type { Expense, ExpenseCategory, Sale } from "../../types/finance.ts";

// ---------------------------------------------------------------------------
// Dates (YYYY-MM-DD, calendar days, UTC arithmetic)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromTime = (time: number) => new Date(time).toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  return fromTime(toTime(date) + days * DAY_MS);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((toTime(end) - toTime(start)) / DAY_MS) + 1;
}

/** Today's date in Zimbabwe (CAT, UTC+2), where the business trades. */
export function harareToday(now: Date): string {
  return new Date(now.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * History is always chosen as dates: one day (?day=YYYY-MM-DD) or a range
 * (?from=…&to=…). With nothing chosen, the 1st of this month to today.
 */
export type HistoryMode = "day" | "range";

export interface HistorySelection {
  mode: HistoryMode;
  range: DateRange;
  /** The equally long stretch just before, for "vs previous" comparisons. */
  previous: DateRange;
}

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromTime(toTime(value)) === value;

export function monthToDate(today: string): DateRange {
  return { start: `${today.slice(0, 7)}-01`, end: today };
}

export function previousRange(range: DateRange): DateRange {
  const length = daysBetween(range.start, range.end);
  return { start: addDays(range.start, -length), end: addDays(range.start, -1) };
}

/**
 * Reads the chosen dates from the page address. `mode` says which the person
 * picked (the filter form submits both kinds of field). Invalid or missing
 * dates fall back to this month so far.
 */
export function readHistoryDates(params: Record<string, string | string[] | undefined>, today: string): HistorySelection {
  const day = (): HistorySelection | undefined => {
    if (!isIsoDate(params.day)) return undefined;
    const range = { start: params.day, end: params.day };
    return { mode: "day", range, previous: previousRange(range) };
  };
  const span = (): HistorySelection | undefined => {
    if (!isIsoDate(params.from) || !isIsoDate(params.to)) return undefined;
    const [start, end] = [params.from, params.to].sort();
    const range = { start, end };
    return { mode: "range", range, previous: previousRange(range) };
  };
  const chosen = params.mode === "range" ? (span() ?? day()) : (day() ?? span());
  if (chosen) return chosen;
  const range = monthToDate(today);
  return { mode: "range", range, previous: previousRange(range) };
}

/** The address parameters for a selection, for links that must keep it. */
export function historyParams(selection: Pick<HistorySelection, "mode" | "range">): Record<string, string> {
  return selection.mode === "day"
    ? { mode: "day", day: selection.range.start }
    : { mode: "range", from: selection.range.start, to: selection.range.end };
}

const inRange = (date: string, range: DateRange) => date >= range.start && date <= range.end;

// ---------------------------------------------------------------------------
// Per-sale figures
// ---------------------------------------------------------------------------

const round = (value: number) => Math.round(value * 100) / 100;

export function saleTotals(sale: Pick<Sale, "items" | "deliveryFee" | "discount"> & { paymentFee?: number }) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const costOfGoods = sale.items.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
  return {
    subtotal: round(subtotal),
    total: round(subtotal - sale.discount + sale.deliveryFee + (sale.paymentFee ?? 0)),
    costOfGoods: round(costOfGoods),
    units: sale.items.reduce((sum, item) => sum + item.quantity, 0),
    missingCost: sale.items.some((item) => item.unitCost === undefined),
  };
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

export interface ProductFacts {
  categories: CategorySlug[];
  condition: ProductCondition;
}

export interface SeriesPoint {
  key: string;
  label: string;
  /** Inclusive range this bucket covers. */
  start: string;
  end: string;
  revenue: number;
  /** Cost of goods + expenses. */
  costs: number;
  profit: number;
}

export interface Analytics {
  range: DateRange;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  /** % of revenue, or null with no revenue. */
  grossMargin: number | null;
  expenses: number;
  netProfit: number;
  netMargin: number | null;
  orders: number;
  units: number;
  averageOrderValue: number | null;
  discounts: number;
  deliveryFees: number;
  /** EcoCash fees charged to customers. */
  paymentFees: number;
  /** Pending sales in the period: money still to be collected. */
  outstanding: number;
  pendingOrders: number;
  cancelledOrders: number;
  /** Paid sales with at least one item lacking a cost price (their profit is overstated). */
  ordersMissingCost: number;
  series: SeriesPoint[];
  bucket: "day" | "week" | "month";
  topProducts: Array<{ name: string; units: number; revenue: number; profit: number | null }>;
  byCategory: Array<{ key: CategorySlug | "other"; revenue: number }>;
  byCondition: Array<{ key: ProductCondition | "unknown"; revenue: number; profit: number }>;
  byPayment: Array<{ key: PaymentMethod; revenue: number; orders: number }>;
  expensesByCategory: Array<{ key: ExpenseCategory; amount: number }>;
}

function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (date: string) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** Day buckets up to a month, weeks (from Monday) up to ~4 months, months beyond. */
function buckets(range: DateRange): { bucket: Analytics["bucket"]; points: SeriesPoint[] } {
  const length = daysBetween(range.start, range.end);
  const empty = { revenue: 0, costs: 0, profit: 0 };
  const points: SeriesPoint[] = [];
  if (length <= 31) {
    for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
      points.push({ key: date, label: dayLabel(date), start: date, end: date, ...empty });
    }
    return { bucket: "day", points };
  }
  if (length <= 120) {
    const weekday = (new Date(`${range.start}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    for (let start = addDays(range.start, -weekday); start <= range.end; start = addDays(start, 7)) {
      const clippedStart = start < range.start ? range.start : start;
      const end = addDays(start, 6) > range.end ? range.end : addDays(start, 6);
      points.push({ key: start, label: `w/c ${dayLabel(start)}`, start: clippedStart, end, ...empty });
    }
    return { bucket: "week", points };
  }
  let [year, month] = range.start.split("-").map(Number);
  for (;;) {
    const start = fromTime(Date.UTC(year, month - 1, 1));
    if (start > range.end) break;
    const monthEnd = fromTime(Date.UTC(year, month, 0));
    points.push({
      key: start.slice(0, 7),
      label: `${MONTHS[month - 1]} ${String(year).slice(2)}`,
      start: start < range.start ? range.start : start,
      end: monthEnd > range.end ? range.end : monthEnd,
      ...empty,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { bucket: "month", points };
}

export function computeAnalytics(
  input: { sales: Sale[]; expenses: Expense[]; products: Map<string, ProductFacts> },
  range: DateRange,
): Analytics {
  const sales = input.sales.filter((sale) => inRange(sale.soldOn, range));
  const paid = sales.filter((sale) => sale.status === "paid");
  const pending = sales.filter((sale) => sale.status === "pending");
  const expenses = input.expenses.filter((expense) => inRange(expense.spentOn, range));

  const totals = new Map(paid.map((sale) => [sale.id, saleTotals(sale)]));
  const revenue = round(paid.reduce((sum, sale) => sum + totals.get(sale.id)!.total, 0));
  const costOfGoods = round(paid.reduce((sum, sale) => sum + totals.get(sale.id)!.costOfGoods, 0));
  const expenseTotal = round(expenses.reduce((sum, expense) => sum + expense.amount, 0));
  const grossProfit = round(revenue - costOfGoods);
  const netProfit = round(grossProfit - expenseTotal);

  // Trend
  const { bucket, points } = buckets(range);
  const bucketFor = (date: string) => points.find((point) => date >= point.start && date <= point.end);
  for (const sale of paid) {
    const point = bucketFor(sale.soldOn);
    if (!point) continue;
    const { total, costOfGoods: cost } = totals.get(sale.id)!;
    point.revenue += total;
    point.costs += cost;
  }
  for (const expense of expenses) {
    const point = bucketFor(expense.spentOn);
    if (point) point.costs += expense.amount;
  }
  for (const point of points) {
    point.revenue = round(point.revenue);
    point.costs = round(point.costs);
    point.profit = round(point.revenue - point.costs);
  }

  // Products, categories, condition. Discounts are spread over a sale's items by value
  // so product revenue adds up to item sales, not to the delivery fees.
  const productRows = new Map<string, { name: string; units: number; revenue: number; cost: number; costKnown: boolean }>();
  const categoryRevenue = new Map<CategorySlug | "other", number>();
  const conditionRows = new Map<ProductCondition | "unknown", { revenue: number; profit: number }>();
  for (const sale of paid) {
    const { subtotal } = totals.get(sale.id)!;
    const keep = subtotal > 0 ? (subtotal - sale.discount) / subtotal : 1;
    for (const item of sale.items) {
      const itemRevenue = item.quantity * item.unitPrice * keep;
      const itemCost = item.quantity * (item.unitCost ?? 0);
      const key = item.productId ?? `name:${item.name.toLowerCase()}`;
      const row = productRows.get(key) ?? { name: item.name, units: 0, revenue: 0, cost: 0, costKnown: true };
      row.units += item.quantity;
      row.revenue += itemRevenue;
      row.cost += itemCost;
      row.costKnown &&= item.unitCost !== undefined;
      productRows.set(key, row);

      // The sale's own copy first: sold products are removed from the catalogue.
      const facts = item.productId ? input.products.get(item.productId) : undefined;
      const category = item.category ?? facts?.categories[0] ?? "other";
      categoryRevenue.set(category, (categoryRevenue.get(category) ?? 0) + itemRevenue);
      const condition = item.condition ?? facts?.condition ?? "unknown";
      const conditionRow = conditionRows.get(condition) ?? { revenue: 0, profit: 0 };
      conditionRow.revenue += itemRevenue;
      conditionRow.profit += itemRevenue - itemCost;
      conditionRows.set(condition, conditionRow);
    }
  }

  const paymentRows = new Map<PaymentMethod, { revenue: number; orders: number }>();
  for (const sale of paid) {
    const row = paymentRows.get(sale.paymentMethod) ?? { revenue: 0, orders: 0 };
    row.revenue += totals.get(sale.id)!.total;
    row.orders += 1;
    paymentRows.set(sale.paymentMethod, row);
  }

  const expenseRows = new Map<ExpenseCategory, number>();
  for (const expense of expenses) expenseRows.set(expense.category, (expenseRows.get(expense.category) ?? 0) + expense.amount);

  const byValue = <T extends { revenue: number }>(a: T, b: T) => b.revenue - a.revenue;

  return {
    range,
    revenue,
    costOfGoods,
    grossProfit,
    grossMargin: percent(grossProfit, revenue),
    expenses: expenseTotal,
    netProfit,
    netMargin: percent(netProfit, revenue),
    orders: paid.length,
    units: paid.reduce((sum, sale) => sum + totals.get(sale.id)!.units, 0),
    averageOrderValue: paid.length > 0 ? round(revenue / paid.length) : null,
    discounts: round(paid.reduce((sum, sale) => sum + sale.discount, 0)),
    deliveryFees: round(paid.reduce((sum, sale) => sum + sale.deliveryFee, 0)),
    paymentFees: round(paid.reduce((sum, sale) => sum + sale.paymentFee, 0)),
    outstanding: round(pending.reduce((sum, sale) => sum + saleTotals(sale).total, 0)),
    pendingOrders: pending.length,
    cancelledOrders: sales.filter((sale) => sale.status === "cancelled").length,
    ordersMissingCost: paid.filter((sale) => totals.get(sale.id)!.missingCost).length,
    series: points,
    bucket,
    topProducts: [...productRows.values()]
      .sort(byValue)
      .slice(0, 8)
      .map((row) => ({
        name: row.name,
        units: row.units,
        revenue: round(row.revenue),
        profit: row.costKnown ? round(row.revenue - row.cost) : null,
      })),
    byCategory: [...categoryRevenue.entries()].map(([key, value]) => ({ key, revenue: round(value) })).sort(byValue),
    byCondition: [...conditionRows.entries()]
      .map(([key, row]) => ({ key, revenue: round(row.revenue), profit: round(row.profit) }))
      .sort(byValue),
    byPayment: [...paymentRows.entries()].map(([key, row]) => ({ key, revenue: round(row.revenue), orders: row.orders })).sort(byValue),
    expensesByCategory: [...expenseRows.entries()]
      .map(([key, amount]) => ({ key, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** % change from previous to current, or null when there's no meaningful base. */
export function change(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
