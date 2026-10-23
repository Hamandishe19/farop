"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { saveSale, type SaleFormState } from "@/app/actions/finance";
import { buttonClass } from "@/components/ui/button-styles";
import { PAYMENT_METHODS, paymentMethodLabels } from "@/config/payments";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { MAX_SALE_ITEMS, parseMoney, type SaleFormValues, type SaleItemFormValues } from "@/lib/validation/finance";
import { SALE_STATUSES, saleStatusLabels } from "@/types/finance";

export interface SaleProductOption {
  id: string;
  name: string;
  price?: number;
  cost?: number;
}

const emptyRow: SaleItemFormValues = { productId: "", name: "", quantity: "1", unitPrice: "", unitCost: "" };

/** Record or edit a sale: date, customer, payment, items (picked from the catalogue or typed), fees. */
export function SaleForm({
  initial,
  saleId,
  products,
  currency,
  ecocashFee,
}: {
  initial: SaleFormValues;
  saleId?: string;
  products: SaleProductOption[];
  currency: string;
  /** The EcoCash fee from the business settings, filled in when EcoCash is chosen. */
  ecocashFee: number;
}) {
  const [state, action, pending] = useActionState<SaleFormState, FormData>(saveSale, { status: "idle" });
  const values = state.status === "idle" ? initial : state.values;
  const errors = state.status === "invalid" ? state.errors : {};
  const [rows, setRows] = useState<SaleItemFormValues[]>(values.items.length > 0 ? values.items : [emptyRow]);
  const [deliveryFee, setDeliveryFee] = useState(values.deliveryFee);
  const [discount, setDiscount] = useState(values.discount);
  const [paymentFee, setPaymentFee] = useState(values.paymentFee);
  // Re-sync with what the server sent back after a failed save.
  const [rowsFor, setRowsFor] = useState(state);
  if (rowsFor !== state) {
    setRowsFor(state);
    setRows(values.items.length > 0 ? values.items : [emptyRow]);
    setDeliveryFee(values.deliveryFee);
    setDiscount(values.discount);
    setPaymentFee(values.paymentFee);
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const update = (index: number, patch: Partial<SaleItemFormValues>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const number = (value: string) => {
    const parsed = parseMoney(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const subtotal = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * number(row.unitPrice), 0);
  const cost = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * number(row.unitCost), 0);
  const total = subtotal - number(discount) + number(deliveryFee) + number(paymentFee);
  const fromCatalogue = rows.filter((row) => row.productId).length;
  const missingCost = rows.some((row) => row.name && row.unitCost === "");
  const show = (value: number) => formatPrice(Math.round(value * 100) / 100, currency);

  const input = (error?: string) =>
    cn(
      "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-charcoal focus:border-sage-deep",
      error ? "border-danger/60" : "border-line",
    );
  const err = (key: keyof typeof errors) =>
    errors[key] && typeof errors[key] === "string" ? (
      <p id={`sale-${key}-error`} className="mt-1 text-xs text-danger">
        {errors[key] as string}
      </p>
    ) : null;

  return (
    <form action={action} noValidate className="space-y-6">
      {saleId && <input type="hidden" name="id" value={saleId} />}
      {(state.status === "refused" || state.status === "invalid") && (
        <p role="alert" className="flex gap-2 rounded-lg bg-blush-soft px-4 py-3 text-sm text-charcoal">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          {state.status === "refused" ? state.message : "Please correct the highlighted fields."}
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="mb-4 text-sm font-medium">Order</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="soldOn" className="mb-1.5 block text-sm">Date of sale</label>
            <input id="soldOn" name="soldOn" type="date" defaultValue={values.soldOn} className={input(errors.soldOn)} aria-invalid={Boolean(errors.soldOn)} />
            {err("soldOn")}
          </div>
          <div>
            <label htmlFor="customerName" className="mb-1.5 block text-sm">
              Customer <span className="text-muted">(optional)</span>
            </label>
            <input id="customerName" name="customerName" defaultValue={values.customerName} className={input()} />
          </div>
          <div>
            <label htmlFor="customerPhone" className="mb-1.5 block text-sm">
              Phone <span className="text-muted">(optional)</span>
            </label>
            <input id="customerPhone" name="customerPhone" type="tel" defaultValue={values.customerPhone} className={input()} />
          </div>
          <fieldset aria-invalid={Boolean(errors.paymentMethod)}>
            <legend className="mb-1.5 text-sm">Payment</legend>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <label key={method} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm has-[:checked]:border-brown has-[:checked]:bg-brown/5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    defaultChecked={values.paymentMethod === method}
                    onChange={() => setPaymentFee(method === "ecocash" && ecocashFee > 0 ? String(ecocashFee) : "")}
                    className="accent-brown"
                  />
                  {paymentMethodLabels[method]}
                </label>
              ))}
            </div>
            {err("paymentMethod")}
          </fieldset>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm">Status</label>
            <select id="status" name="status" defaultValue={values.status} className={input(errors.status)}>
              {SALE_STATUSES.map((value) => (
                <option key={value} value={value}>{saleStatusLabels[value]}</option>
              ))}
            </select>
            {err("status")}
            <p className="mt-1 text-xs text-muted">Only paid sales count as revenue.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="mb-1 text-sm font-medium">Items</h2>
        <p className="mb-4 text-xs text-muted">
          Pick a product to fill in its price and cost price, or type any item. Cost = what you paid per item.
        </p>
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="rounded-lg border border-line p-3">
              <input type="hidden" name="itemProductId" value={row.productId} />
              <div className="grid gap-3 sm:grid-cols-[2fr_1.6fr_0.7fr_1fr_1fr_auto] sm:items-end">
                <div>
                  <label htmlFor={`item-product-${index}`} className="mb-1 block text-xs text-muted">Product</label>
                  <select
                    id={`item-product-${index}`}
                    value={row.productId}
                    onChange={(event) => {
                      const product = byId.get(event.target.value);
                      update(
                        index,
                        product
                          ? {
                              productId: product.id,
                              name: product.name,
                              unitPrice: product.price !== undefined ? String(product.price) : row.unitPrice,
                              unitCost: product.cost !== undefined ? String(product.cost) : "",
                            }
                          : { productId: "" },
                      );
                    }}
                    className={input()}
                  >
                    <option value="">Other / not in the catalogue</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`item-name-${index}`} className="mb-1 block text-xs text-muted">Item name</label>
                  <input id={`item-name-${index}`} name="itemName" value={row.name} onChange={(event) => update(index, { name: event.target.value })} className={input()} />
                </div>
                <div>
                  <label htmlFor={`item-qty-${index}`} className="mb-1 block text-xs text-muted">Qty</label>
                  <input id={`item-qty-${index}`} name="itemQuantity" inputMode="numeric" value={row.quantity} onChange={(event) => update(index, { quantity: event.target.value })} className={input()} />
                </div>
                <div>
                  <label htmlFor={`item-price-${index}`} className="mb-1 block text-xs text-muted">Price each</label>
                  <input id={`item-price-${index}`} name="itemUnitPrice" inputMode="decimal" value={row.unitPrice} onChange={(event) => update(index, { unitPrice: event.target.value })} className={input()} />
                </div>
                <div>
                  <label htmlFor={`item-cost-${index}`} className="mb-1 block text-xs text-muted">Cost each</label>
                  <input id={`item-cost-${index}`} name="itemUnitCost" inputMode="decimal" placeholder="Unknown" value={row.unitCost} onChange={(event) => update(index, { unitCost: event.target.value })} className={input()} />
                </div>
                <button
                  type="button"
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  className="inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-lg text-muted hover:bg-cream hover:text-danger disabled:opacity-30"
                >
                  <X size={16} aria-hidden="true" />
                  <span className="sr-only">Remove item {index + 1}</span>
                </button>
              </div>
              {errors.itemRows?.[index] && <p className="mt-2 text-xs text-danger">{errors.itemRows[index]}</p>}
            </div>
          ))}
        </div>
        {errors.items && <p className="mt-2 text-xs text-danger">{errors.items}</p>}
        {fromCatalogue > 0 && (
          <p className="mt-3 rounded-lg bg-blush-soft px-3.5 py-2.5 text-xs leading-relaxed text-charcoal">
            When you save, {fromCatalogue === 1 ? "this catalogue product is" : `these ${fromCatalogue} catalogue products are`}{" "}
            removed from the shop because {fromCatalogue === 1 ? "it has" : "they have"} been sold (not if the sale is
            cancelled). The sale keeps the name, price and cost.
          </p>
        )}
        {rows.length < MAX_SALE_ITEMS && (
          <button
            type="button"
            onClick={() => setRows((current) => [...current, emptyRow])}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-charcoal hover:bg-cream"
          >
            <Plus size={14} aria-hidden="true" />
            Add an item
          </button>
        )}
      </section>

      <section className="grid gap-6 rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:grid-cols-[1fr_1fr]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deliveryFee" className="mb-1.5 block text-sm">Delivery fee charged</label>
            <input id="deliveryFee" name="deliveryFee" inputMode="decimal" placeholder="0" value={deliveryFee} onChange={(event) => setDeliveryFee(event.target.value)} className={input(errors.deliveryFee)} />
            {err("deliveryFee")}
          </div>
          <div>
            <label htmlFor="paymentFee" className="mb-1.5 block text-sm">EcoCash fee charged</label>
            <input id="paymentFee" name="paymentFee" inputMode="decimal" placeholder="0" value={paymentFee} onChange={(event) => setPaymentFee(event.target.value)} className={input(errors.paymentFee)} />
            {err("paymentFee")}
          </div>
          <div>
            <label htmlFor="discount" className="mb-1.5 block text-sm">Discount given</label>
            <input id="discount" name="discount" inputMode="decimal" placeholder="0" value={discount} onChange={(event) => setDiscount(event.target.value)} className={input(errors.discount)} />
            {err("discount")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1.5 block text-sm">
              Notes <span className="text-muted">(optional)</span>
            </label>
            <textarea id="notes" name="notes" rows={2} defaultValue={values.notes} className={input()} />
          </div>
        </div>
        <dl className="space-y-2 self-start rounded-lg bg-cream/60 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="tabular-nums">{show(subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">−{show(number(discount))}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Delivery fee</dt><dd className="tabular-nums">{show(number(deliveryFee))}</dd></div>
          {number(paymentFee) > 0 && (
            <div className="flex justify-between"><dt className="text-muted">EcoCash fee</dt><dd className="tabular-nums">{show(number(paymentFee))}</dd></div>
          )}
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{show(total)}</dd></div>
          <div className="flex justify-between text-muted"><dt>Cost of goods</dt><dd className="tabular-nums">{show(cost)}</dd></div>
          <div className="flex justify-between font-medium"><dt>Gross profit</dt><dd className="tabular-nums">{show(total - cost)}</dd></div>
          {missingCost && <p className="text-xs text-brown">Some items have no cost price, so profit is shown higher than it is.</p>}
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={buttonClass()}>
          {pending ? "Saving…" : saleId ? "Save changes" : "Record sale"}
        </button>
        <Link href="/admin/finance/sales" className={buttonClass({ variant: "secondary" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
