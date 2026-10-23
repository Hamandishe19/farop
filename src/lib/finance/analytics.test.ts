import { test } from "node:test";
import assert from "node:assert/strict";
import { change, computeAnalytics, harareToday, historyParams, monthToDate, readHistoryDates, saleTotals, type ProductFacts } from "./analytics.ts";
import { readExpenseForm, readSaleForm, validateCategoryName, validateExpense, validateSale } from "../validation/finance.ts";
import type { Expense, Sale } from "../../types/finance.ts";

const sale = (overrides: Partial<Sale>): Sale => ({
  id: Math.random().toString(36),
  soldOn: "2026-10-05",
  paymentMethod: "cod",
  status: "paid",
  items: [{ productId: "p1", name: "Bodysuit", quantity: 2, unitPrice: 8, unitCost: 3 }],
  deliveryFee: 0,
  paymentFee: 0,
  discount: 0,
  createdAt: "2026-10-05T10:00:00Z",
  ...overrides,
});

const expense = (overrides: Partial<Expense>): Expense => ({
  id: Math.random().toString(36),
  spentOn: "2026-10-06",
  category: "delivery",
  amount: 5,
  createdAt: "2026-10-06T10:00:00Z",
  ...overrides,
});

const products = new Map<string, ProductFacts>([
  ["p1", { categories: ["babywear", "boys"], condition: "new" }],
  ["p2", { categories: ["shoes"], condition: "preloved" }],
]);

const october = { start: "2026-10-01", end: "2026-10-31" };

test("sale totals: items − discount + delivery; cost of goods from cost prices", () => {
  const totals = saleTotals({
    items: [
      { name: "A", quantity: 2, unitPrice: 8, unitCost: 3 },
      { name: "B", quantity: 1, unitPrice: 10 },
    ],
    discount: 2,
    deliveryFee: 3,
  });
  assert.deepEqual(totals, { subtotal: 26, total: 27, costOfGoods: 6, units: 3, missingCost: true });
});

test("revenue counts paid sales only; profit subtracts goods and expenses", () => {
  const report = computeAnalytics(
    {
      sales: [
        sale({ deliveryFee: 2 }), // 16 + 2 = 18, cost 6
        sale({ status: "pending" }), // owed: 16
        sale({ status: "cancelled" }),
        sale({ soldOn: "2026-09-30" }), // outside the range
        sale({ items: [{ productId: "p2", name: "Shoes", quantity: 1, unitPrice: 12 }], paymentMethod: "ecocash" }), // no cost
      ],
      expenses: [expense({}), expense({ category: "rent", amount: 10 }), expense({ spentOn: "2026-11-01" })],
      products,
    },
    october,
  );
  assert.equal(report.revenue, 30);
  assert.equal(report.costOfGoods, 6);
  assert.equal(report.grossProfit, 24);
  assert.equal(report.grossMargin, 80);
  assert.equal(report.expenses, 15);
  assert.equal(report.netProfit, 9);
  assert.equal(report.netMargin, 30);
  assert.equal(report.orders, 2);
  assert.equal(report.units, 3);
  assert.equal(report.averageOrderValue, 15);
  assert.equal(report.outstanding, 16);
  assert.equal(report.pendingOrders, 1);
  assert.equal(report.cancelledOrders, 1);
  assert.equal(report.ordersMissingCost, 1);
  assert.deepEqual(report.byCategory.map((row) => row.key), ["babywear", "shoes"]);
  assert.deepEqual(report.byPayment, [
    { key: "cod", revenue: 18, orders: 1 },
    { key: "ecocash", revenue: 12, orders: 1 },
  ]);
  assert.equal(report.topProducts.find((row) => row.name === "Shoes")?.profit, null, "unknown cost → no profit shown");
  assert.deepEqual(report.expensesByCategory, [
    { key: "rent", amount: 10 },
    { key: "delivery", amount: 5 },
  ]);
  assert.equal(report.bucket, "day");
  assert.equal(report.series.length, 31);
  const fifth = report.series.find((point) => point.key === "2026-10-05")!;
  assert.deepEqual([fifth.revenue, fifth.costs, fifth.profit], [30, 6, 24]);
});

test("discounts are spread over a sale's items", () => {
  const report = computeAnalytics(
    { sales: [sale({ discount: 4 })], expenses: [], products },
    october,
  );
  assert.equal(report.topProducts[0].revenue, 12);
  assert.equal(report.topProducts[0].profit, 6);
  assert.equal(report.discounts, 4);
});

test("buckets, Harare date and % change", () => {
  assert.equal(computeAnalytics({ sales: [], expenses: [], products }, { start: "2026-01-01", end: "2026-10-23" }).bucket, "month");
  assert.equal(computeAnalytics({ sales: [], expenses: [], products }, { start: "2026-07-26", end: "2026-10-23" }).bucket, "week");
  assert.equal(computeAnalytics({ sales: [], expenses: [], products }, { start: "2026-10-23", end: "2026-10-23" }).series.length, 1);
  assert.equal(harareToday(new Date("2026-10-23T23:30:00Z")), "2026-10-24", "Harare is UTC+2");
  assert.equal(change(120, 100), 20);
  assert.equal(change(-50, -100), 50);
  assert.equal(change(10, 0), null);
});

function form(entries: Array<[string, string]>): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

test("sale form: rows read in order, empty rows skipped, problems reported per row", () => {
  const values = readSaleForm(
    form([
      ["soldOn", "2026-10-05"],
      ["paymentMethod", "ecocash"],
      ["status", "paid"],
      ["deliveryFee", "2.50"],
      ["itemProductId", "p1"], ["itemName", "Bodysuit"], ["itemQuantity", "2"], ["itemUnitPrice", "8"], ["itemUnitCost", "3"],
      ["itemProductId", ""], ["itemName", ""], ["itemQuantity", "1"], ["itemUnitPrice", ""], ["itemUnitCost", ""],
      ["itemProductId", ""], ["itemName", "Hat"], ["itemQuantity", "0"], ["itemUnitPrice", "5"], ["itemUnitCost", ""],
    ]),
  );
  assert.equal(values.items.length, 2);
  const invalid = validateSale(values);
  assert.equal(invalid.sale, undefined);
  assert.deepEqual(invalid.errors.itemRows, { 1: "Quantity must be a whole number from 1." });

  values.items[1].quantity = "1";
  const { sale: valid } = validateSale(values);
  assert.equal(valid?.deliveryFee, 2.5);
  assert.equal(valid?.items[1].unitCost, undefined);
  assert.equal(valid?.items[0].productId, "p1");

  assert.ok(validateSale({ ...values, soldOn: "2026-02-30" }).errors.soldOn, "impossible date");
  assert.ok(validateSale({ ...values, discount: "100" }).errors.discount, "discount above total");
});

test("expense form", () => {
  const ok = validateExpense(readExpenseForm(form([["spentOn", "2026-10-06"], ["category", "rent"], ["amount", "40"]])));
  assert.equal(ok.expense?.amount, 40);
  const bad = validateExpense(readExpenseForm(form([["spentOn", ""], ["category", "travel"], ["amount", "-3"]])));
  assert.deepEqual(Object.keys(bad.errors).sort(), ["amount", "category", "spentOn"]);
});

test("history dates: one day, a range, or this month so far", () => {
  const today = "2026-10-23";
  assert.deepEqual(readHistoryDates({ day: "2026-10-05" }, today), {
    mode: "day",
    range: { start: "2026-10-05", end: "2026-10-05" },
    previous: { start: "2026-10-04", end: "2026-10-04" },
  });
  assert.deepEqual(readHistoryDates({ from: "2026-03-10", to: "2026-03-01" }, today), {
    mode: "range",
    range: { start: "2026-03-01", end: "2026-03-10" },
    previous: { start: "2026-02-19", end: "2026-02-28" },
  }, "reversed dates are swapped");
  const fallback = { mode: "range", range: { start: "2026-10-01", end: "2026-10-23" }, previous: { start: "2026-09-08", end: "2026-09-30" } };
  assert.deepEqual(readHistoryDates({}, today), fallback);
  assert.deepEqual(readHistoryDates({ day: "2026-02-30" }, today), fallback, "impossible date");
  assert.deepEqual(readHistoryDates({ from: "2026-03-01" }, today), fallback, "range needs both dates");
  assert.deepEqual(monthToDate("2026-01-15"), { start: "2026-01-01", end: "2026-01-15" });
  assert.deepEqual(historyParams({ mode: "day", range: { start: "2026-10-05", end: "2026-10-05" } }), { mode: "day", day: "2026-10-05" });
  assert.deepEqual(historyParams({ mode: "range", range: { start: "2026-03-01", end: "2026-03-10" } }), {
    mode: "range",
    from: "2026-03-01",
    to: "2026-03-10",
  });
  // The form sends every field; `mode` decides which one counts.
  const both = { day: "2026-10-05", from: "2026-03-01", to: "2026-03-10" };
  assert.equal(readHistoryDates({ ...both, mode: "range" }, today).mode, "range");
  assert.equal(readHistoryDates({ ...both, mode: "day" }, today).mode, "day");
});

test("EcoCash fees count as revenue; sold-product facts come from the sale itself", () => {
  const report = computeAnalytics(
    {
      sales: [
        sale({ paymentMethod: "ecocash", paymentFee: 1 }), // 16 + 1
        // Product p9 no longer exists in the catalogue: the item's own copy is used.
        sale({ items: [{ productId: "p9", name: "Sold dress", quantity: 1, unitPrice: 20, unitCost: 8, category: "girls", condition: "preloved" }] }),
      ],
      expenses: [],
      products,
    },
    october,
  );
  assert.equal(report.revenue, 37);
  assert.equal(report.paymentFees, 1);
  assert.equal(report.grossProfit, 37 - 6 - 8);
  assert.deepEqual(report.byCategory.map((row) => row.key), ["girls", "babywear"]);
  assert.equal(report.byCondition.find((row) => row.key === "preloved")?.revenue, 20);
  assert.equal(saleTotals({ items: [], deliveryFee: 2, discount: 0, paymentFee: 1 }).total, 3);
});

test("custom expense categories", () => {
  const existing = [
    { key: "delivery", label: "Delivery & transport" },
    { key: "custom-photography", label: "Photography" },
  ];
  assert.deepEqual(validateCategoryName("  Market   stall fees ", existing), { name: "Market stall fees", key: "custom-market-stall-fees" });
  assert.deepEqual(validateCategoryName("Café supplies", existing), { name: "Café supplies", key: "custom-cafe-supplies" });
  assert.ok("error" in validateCategoryName("photography", existing), "same name, different case");
  assert.ok("error" in validateCategoryName("x", existing));
  assert.ok("error" in validateCategoryName("!!!", existing));

  const values = { spentOn: "2026-10-06", category: "custom-photography", amount: "12", description: "" };
  assert.equal(validateExpense(values).errors.category, "Choose a category.", "unknown unless it exists");
  assert.equal(validateExpense(values, ["delivery", "custom-photography"]).expense?.category, "custom-photography");
});
