import type { PaymentMethod } from "../config/payments.ts";
import type { CategorySlug, ProductCondition } from "./product.ts";

/**
 * A sale is a WhatsApp order the business has confirmed and recorded in the
 * admin. Only "paid" sales count as revenue; "pending" ones are money still
 * owed; "cancelled" ones are kept for the record but count nowhere.
 */
export const SALE_STATUSES = ["pending", "paid", "cancelled"] as const;

export type SaleStatus = (typeof SALE_STATUSES)[number];

export const saleStatusLabels: Record<SaleStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
};

export interface SaleItem {
  /** The catalogue product, when the item came from it (kept even if the product is later deleted). */
  productId?: string;
  /** Name at the time of sale. */
  name: string;
  quantity: number;
  /** Selling price per unit. */
  unitPrice: number;
  /** What the business paid per unit, at the time of sale. Unknown = not counted in cost of goods. */
  unitCost?: number;
  /**
   * The product's main category and condition, copied at the time of sale.
   * Sold products are removed from the catalogue, so the sale keeps these itself.
   */
  category?: CategorySlug;
  condition?: ProductCondition;
}

export interface Sale {
  id: string;
  /** Calendar date of the sale, YYYY-MM-DD. */
  soldOn: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  items: SaleItem[];
  deliveryFee: number;
  /** EcoCash fee charged to the customer (0 for cash on delivery). */
  paymentFee: number;
  discount: number;
  notes?: string;
  createdAt: string;
}

/** Categories every business has. Admins can add their own on the Expenses page. */
export const BUILT_IN_EXPENSE_CATEGORIES = [
  "stock",
  "delivery",
  "packaging",
  "rent",
  "wages",
  "marketing",
  "utilities",
  "fees",
  "other",
] as const;

export type BuiltInExpenseCategory = (typeof BUILT_IN_EXPENSE_CATEGORIES)[number];

/** A built-in key, or the key of a category an admin created (always starts with "custom-"). */
export type ExpenseCategory = string;

export const builtInExpenseCategoryLabels: Record<BuiltInExpenseCategory, string> = {
  stock: "Stock purchases (not in cost prices)",
  delivery: "Delivery & transport",
  packaging: "Packaging",
  rent: "Rent & storage",
  wages: "Wages",
  marketing: "Marketing & adverts",
  utilities: "Airtime, data & utilities",
  fees: "EcoCash & bank fees",
  other: "Other",
};

/** One category as offered in forms and shown in reports. */
export interface ExpenseCategoryOption {
  key: ExpenseCategory;
  label: string;
  builtIn: boolean;
}

export const CUSTOM_CATEGORY_PREFIX = "custom-";

/** Name for a category key, falling back to the key itself if the category has gone. */
export function expenseCategoryLabel(key: ExpenseCategory, options: ExpenseCategoryOption[]): string {
  return options.find((option) => option.key === key)?.label ?? key.replace(CUSTOM_CATEGORY_PREFIX, "").replace(/-/g, " ");
}

export interface Expense {
  id: string;
  /** YYYY-MM-DD */
  spentOn: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  createdAt: string;
}
