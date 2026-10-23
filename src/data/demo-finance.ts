/**
 * DEMONSTRATION FINANCE DATA — NOT REAL FIGURES.
 *
 * Used only by the admin preview (no database) so the analytics, sales and
 * expenses pages can be tried out. Generated relative to "today" so recent
 * periods always have figures, and deterministic so numbers don't jump
 * between page loads. Once Supabase is connected none of this is used.
 */

import { addDays } from "../lib/finance/analytics.ts";
import type { Expense, ExpenseCategory, Sale, SaleItem } from "../types/finance.ts";
import { demoProducts } from "./demo-products.ts";

/** A sample custom expense category, to show how admins' own categories appear. */
export const demoCustomCategories = [{ key: "custom-photography", label: "Product photography" }];

/** Sample cost prices (what the business paid per unit) for the sample products. */
export const demoCostPrices: Record<string, number> = {
  "demo-001": 3.5,
  "demo-002": 7,
  "demo-003": 4,
  "demo-004": 3,
  "demo-005": 3,
  "demo-006": 12,
  "demo-007": 4.5,
  "demo-008": 8,
  "demo-009": 9,
  "demo-010": 4,
  "demo-011": 4.5,
  "demo-012": 2,
  "demo-013": 3.5,
  // demo-014 deliberately has no cost price, to show the "missing cost" warning.
};

/** Small seeded random generator (mulberry32) so the sample data is the same on every load. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 185;
const customers = ["Rudo M.", "Tendai C.", "Chipo N.", "Farai K.", "Nyasha G.", "Tatenda B.", "Ruvimbo S.", "Kudzai P."];

export function demoFinance(today: string): { sales: Sale[]; expenses: Expense[] } {
  const next = random(20261023);
  const pick = <T,>(list: T[]) => list[Math.floor(next() * list.length)];
  const priced = demoProducts.filter((product) => product.price !== undefined);
  const sales: Sale[] = [];
  const expenses: Expense[] = [];

  for (let offset = DAYS; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    // Busier towards the present, and on the delivery days (Thursday, Saturday).
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const growth = 0.55 + (DAYS - offset) / DAYS;
    const orders = Math.floor(next() * 2.2 * growth + (weekday === 4 || weekday === 6 ? 0.8 : 0));

    for (let n = 0; n < orders; n += 1) {
      const items: SaleItem[] = [];
      const lines = 1 + Math.floor(next() * 2.4);
      for (let line = 0; line < lines; line += 1) {
        const product = pick(priced);
        if (items.some((item) => item.productId === product.id)) continue;
        items.push({
          productId: product.id,
          name: product.name,
          quantity: 1 + Math.floor(next() * next() * 3),
          unitPrice: product.price!,
          unitCost: demoCostPrices[product.id],
          category: product.categories[0],
          condition: product.condition,
        });
      }
      const recent = offset < 6;
      const roll = next();
      const paymentMethod = next() < 0.55 ? "ecocash" : "cod";
      sales.push({
        id: `demo-sale-${sales.length + 1}`,
        soldOn: date,
        customerName: pick(customers),
        paymentMethod,
        paymentFee: paymentMethod === "ecocash" ? 1 : 0,
        status: recent && roll < 0.45 ? "pending" : roll > 0.96 ? "cancelled" : "paid",
        items,
        deliveryFee: next() < 0.6 ? 2 : 0,
        discount: next() < 0.12 ? 1 : 0,
        createdAt: `${date}T09:00:00.000Z`,
      });
    }

    const add = (category: ExpenseCategory, amount: number, description: string) =>
      expenses.push({ id: `demo-expense-${expenses.length + 1}`, spentOn: date, category, amount, description, createdAt: `${date}T08:00:00.000Z` });
    const dayOfMonth = Number(date.slice(8));
    if (dayOfMonth === 1) add("rent", 40, "Storage room");
    if (dayOfMonth === 3) add("utilities", 8 + Math.round(next() * 6), "Airtime & data bundles");
    if (dayOfMonth === 15) add("marketing", 10 + Math.round(next() * 15), "Facebook adverts");
    if (dayOfMonth === 20) add("packaging", 6 + Math.round(next() * 6), "Bags & tissue paper");
    if (weekday === 4 || weekday === 6) add("delivery", 4 + Math.round(next() * 5), "Fuel for deliveries");
    if (dayOfMonth === 28) add("fees", 2 + Math.round(next() * 3), "EcoCash charges");
    if (dayOfMonth === 10) add("custom-photography", 5 + Math.round(next() * 5), "Photos of new stock");
  }

  return { sales: sales.reverse(), expenses: expenses.reverse() };
}
