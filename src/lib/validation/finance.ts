import { PAYMENT_METHODS, type PaymentMethod } from "../../config/payments.ts";
import {
  BUILT_IN_EXPENSE_CATEGORIES,
  CUSTOM_CATEGORY_PREFIX,
  SALE_STATUSES,
  type Expense,
  type ExpenseCategory,
  type Sale,
  type SaleItem,
  type SaleStatus,
} from "../../types/finance.ts";

export const MAX_SALE_ITEMS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(formData: FormData, key: string, max = 200): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Money as typed ("12", "12.5", "") → number rounded to cents, or NaN when not a valid amount. */
export function parseMoney(value: string): number {
  if (value.trim() === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return Number.NaN;
  return Math.round(Number(value) * 100) / 100;
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export interface SaleItemFormValues {
  productId: string;
  name: string;
  quantity: string;
  unitPrice: string;
  unitCost: string;
}

export interface SaleFormValues {
  soldOn: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  status: string;
  deliveryFee: string;
  paymentFee: string;
  discount: string;
  notes: string;
  items: SaleItemFormValues[];
}

export type SaleFormErrors = Partial<Record<Exclude<keyof SaleFormValues, "items">, string>> & {
  items?: string;
  itemRows?: Record<number, string>;
};

export function readSaleForm(formData: FormData): SaleFormValues {
  const column = (key: string) => formData.getAll(key).map((value) => String(value).trim().slice(0, 120));
  const productIds = column("itemProductId");
  const names = column("itemName");
  const quantities = column("itemQuantity");
  const prices = column("itemUnitPrice");
  const costs = column("itemUnitCost");
  return {
    soldOn: str(formData, "soldOn", 10),
    customerName: str(formData, "customerName", 80),
    customerPhone: str(formData, "customerPhone", 30),
    paymentMethod: str(formData, "paymentMethod", 20),
    status: str(formData, "status", 20),
    deliveryFee: str(formData, "deliveryFee", 12),
    paymentFee: str(formData, "paymentFee", 12),
    discount: str(formData, "discount", 12),
    notes: str(formData, "notes", 500),
    items: names
      .slice(0, MAX_SALE_ITEMS)
      .map((name, index) => ({
        productId: productIds[index] ?? "",
        name,
        quantity: quantities[index] ?? "",
        unitPrice: prices[index] ?? "",
        unitCost: costs[index] ?? "",
      }))
      // A row the admin left completely empty is ignored, not an error.
      .filter((item) => item.name || item.productId || item.unitPrice),
  };
}

export function validateSale(values: SaleFormValues): {
  errors: SaleFormErrors;
  sale?: Omit<Sale, "id" | "createdAt">;
} {
  const errors: SaleFormErrors = {};
  if (!isRealDate(values.soldOn)) errors.soldOn = "Enter the date of the sale.";
  if (!PAYMENT_METHODS.includes(values.paymentMethod as PaymentMethod)) errors.paymentMethod = "Choose how they paid.";
  if (!SALE_STATUSES.includes(values.status as SaleStatus)) errors.status = "Choose a status.";
  const deliveryFee = parseMoney(values.deliveryFee);
  if (Number.isNaN(deliveryFee)) errors.deliveryFee = "Enter an amount like 3 or 2.50.";
  const paymentFee = parseMoney(values.paymentFee);
  if (Number.isNaN(paymentFee)) errors.paymentFee = "Enter an amount like 1 or 1.50.";
  const discount = parseMoney(values.discount);
  if (Number.isNaN(discount)) errors.discount = "Enter an amount like 3 or 2.50.";

  if (values.items.length === 0) errors.items = "Add at least one item.";
  const itemRows: Record<number, string> = {};
  const items: SaleItem[] = values.items.map((row, index) => {
    const quantity = Number(row.quantity);
    const unitPrice = parseMoney(row.unitPrice);
    const unitCost = row.unitCost === "" ? undefined : parseMoney(row.unitCost);
    if (!row.name) itemRows[index] = "Name the item.";
    else if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) itemRows[index] = "Quantity must be a whole number from 1.";
    else if (Number.isNaN(unitPrice) || row.unitPrice === "") itemRows[index] = "Enter the price per item.";
    else if (unitCost !== undefined && Number.isNaN(unitCost)) itemRows[index] = "Cost must be an amount like 4.50, or blank.";
    return { productId: row.productId || undefined, name: row.name, quantity, unitPrice, unitCost };
  });
  if (Object.keys(itemRows).length > 0) errors.itemRows = itemRows;

  if (!errors.discount && !errors.items && !errors.itemRows) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (discount > subtotal) errors.discount = "The discount is bigger than the items' total.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    sale: {
      soldOn: values.soldOn,
      customerName: values.customerName || undefined,
      customerPhone: values.customerPhone || undefined,
      paymentMethod: values.paymentMethod as PaymentMethod,
      status: values.status as SaleStatus,
      items,
      deliveryFee,
      paymentFee,
      discount,
      notes: values.notes || undefined,
    },
  };
}

export function saleToForm(sale: Omit<Sale, "id" | "createdAt">): SaleFormValues {
  const money = (value: number | undefined) => (value === undefined ? "" : String(value));
  return {
    soldOn: sale.soldOn,
    customerName: sale.customerName ?? "",
    customerPhone: sale.customerPhone ?? "",
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    deliveryFee: sale.deliveryFee ? String(sale.deliveryFee) : "",
    paymentFee: sale.paymentFee ? String(sale.paymentFee) : "",
    discount: sale.discount ? String(sale.discount) : "",
    notes: sale.notes ?? "",
    items: sale.items.map((item) => ({
      productId: item.productId ?? "",
      name: item.name,
      quantity: String(item.quantity),
      unitPrice: money(item.unitPrice),
      unitCost: money(item.unitCost),
    })),
  };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export interface ExpenseFormValues {
  spentOn: string;
  category: string;
  amount: string;
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export function readExpenseForm(formData: FormData): ExpenseFormValues {
  return {
    spentOn: str(formData, "spentOn", 10),
    category: str(formData, "category", 20),
    amount: str(formData, "amount", 12),
    description: str(formData, "description", 200),
  };
}

/** `categories`: the keys that currently exist (built-in and custom). */
export function validateExpense(
  values: ExpenseFormValues,
  categories: readonly string[] = BUILT_IN_EXPENSE_CATEGORIES,
): {
  errors: ExpenseFormErrors;
  expense?: Omit<Expense, "id" | "createdAt">;
} {
  const errors: ExpenseFormErrors = {};
  if (!isRealDate(values.spentOn)) errors.spentOn = "Enter the date.";
  if (!categories.includes(values.category)) errors.category = "Choose a category.";
  const amount = parseMoney(values.amount);
  if (values.amount === "" || Number.isNaN(amount) || amount <= 0) errors.amount = "Enter an amount like 15 or 7.50.";
  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    expense: {
      spentOn: values.spentOn,
      category: values.category as ExpenseCategory,
      amount,
      description: values.description || undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Custom expense categories
// ---------------------------------------------------------------------------

/**
 * Checks a new category name and makes its key ("Market stall fees" →
 * "custom-market-stall-fees"). `existing` = labels and keys already in use.
 */
export function validateCategoryName(
  rawName: string,
  existing: Array<{ key: string; label: string }>,
): { name: string; key: string } | { error: string } {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 2) return { error: "Give the category a name (2+ characters)." };
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  if (!slug) return { error: "Use letters or numbers in the name." };
  const key = `${CUSTOM_CATEGORY_PREFIX}${slug}`;
  if (existing.some((category) => category.label.toLowerCase() === name.toLowerCase() || category.key === key)) {
    return { error: "There's already a category with that name." };
  }
  return { name, key };
}
