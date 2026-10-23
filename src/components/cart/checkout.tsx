"use client";

import Link from "next/link";
import { useId, useState, type SubmitEvent } from "react";
import { Banknote, Info, Smartphone, WifiOff } from "lucide-react";
import { LocationPicker } from "@/components/cart/location-picker";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { buttonClass } from "@/components/ui/button-styles";
import { PAYMENT_METHODS, paymentMethodLabels, type PaymentMethod } from "@/config/payments";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/cn";
import { formatList, formatPrice } from "@/lib/format";
import { buildOrderMessage, buildWhatsAppUrl, calculateTotals, type MapLocation } from "@/lib/whatsapp";
import type { CartLine } from "@/types/cart";
import type { BusinessSettings } from "@/types/settings";

/** The business settings checkout needs (passed from the server). */
export type OrderSettings = Pick<BusinessSettings, "whatsapp" | "ecocashNumber" | "ecocashFee" | "deliveryDays"> & {
  /** Shop currency, for the EcoCash fee when items have no price yet. */
  currency: string;
};

const paymentIcons = { cod: Banknote, ecocash: Smartphone } satisfies Record<PaymentMethod, typeof Banknote>;

const paymentHints: Record<PaymentMethod, string> = {
  cod: "Pay in cash when your order is delivered.",
  ecocash: "Pay by EcoCash once we confirm your order.",
};

type Field = "customerName" | "deliveryAddress" | "payment";

/**
 * Checkout: delivery details and payment method, then "Place Order via
 * WhatsApp". Opens WhatsApp with the order prefilled; the customer reviews
 * and sends it themselves. Nothing is sent or charged automatically.
 */
export function Checkout({
  lines,
  businessName,
  orderSettings,
}: {
  lines: CartLine[];
  businessName: string;
  orderSettings: OrderSettings;
}) {
  const online = useOnlineStatus();
  const formId = useId();
  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [location, setLocation] = useState<MapLocation>();
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod | "">("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [opened, setOpened] = useState(false);

  const totals = calculateTotals(lines);
  const currency = totals.currency ?? orderSettings.currency;
  const ecocashFee = orderSettings.ecocashFee;
  const feeText = formatPrice(ecocashFee, currency);
  const known = totals.subtotal !== undefined && totals.currency !== undefined;
  const totalToPay = (withFee: boolean) =>
    known ? formatPrice(Math.round(((totals.subtotal as number) + (withFee ? ecocashFee : 0)) * 100) / 100, currency) : undefined;
  const message = buildOrderMessage(
    lines,
    { payment: payment || undefined, customerName, deliveryAddress, location, notes },
    { businessName, ecocashNumber: orderSettings.ecocashNumber, ecocashFee, currency: orderSettings.currency },
  );
  const url = buildWhatsAppUrl(orderSettings.whatsapp, message);
  const { deliveryDays, ecocashNumber } = orderSettings;

  function placeOrder(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (customerName.trim().length < 2) next.customerName = "Enter your name.";
    if (deliveryAddress.trim().length < 5) next.deliveryAddress = "Enter your delivery address.";
    if (!payment) next.payment = "Choose how you'd like to pay.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !url || !online) return;

    const tab = window.open(url, "_blank");
    if (tab) tab.opener = null;
    else window.location.href = url;
    setOpened(true);
  }

  const input = (error?: string) =>
    cn(
      "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-sage-deep",
      error ? "border-danger/60" : "border-line",
    );
  const err = (key: Field) =>
    errors[key] && (
      <p id={`${formId}-${key}-error`} className="mt-1 text-xs text-danger">
        {errors[key]}
      </p>
    );
  const a11y = (key: Field) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `${formId}-${key}-error` : undefined,
  });

  if (!url) {
    return (
      <div className="space-y-3">
        <button type="button" disabled className={buttonClass({ variant: "whatsapp", size: "lg", block: true })}>
          <WhatsAppIcon size={18} />
          Place Order via WhatsApp
        </button>
        <p className="flex gap-2 rounded-lg bg-cream px-3.5 py-3 text-sm leading-relaxed text-charcoal">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          <span>
            WhatsApp ordering is not available yet — our business number is still being set up. Please{" "}
            <Link href="/contact" className="underline underline-offset-4">
              visit the contact page
            </Link>{" "}
            in the meantime. Your cart will be saved on this device.
          </span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={placeOrder} noValidate className="space-y-5">
      <div>
        <label htmlFor={`${formId}-name`} className="mb-1.5 block text-sm text-charcoal">Your name</label>
        <input
          id={`${formId}-name`}
          autoComplete="name"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          className={input(errors.customerName)}
          {...a11y("customerName")}
        />
        {err("customerName")}
      </div>

      <div>
        <label htmlFor={`${formId}-address`} className="mb-1.5 block text-sm text-charcoal">Delivery address</label>
        <textarea
          id={`${formId}-address`}
          rows={2}
          autoComplete="street-address"
          placeholder="House number, street, suburb, city"
          value={deliveryAddress}
          onChange={(event) => setDeliveryAddress(event.target.value)}
          className={input(errors.deliveryAddress)}
          {...a11y("deliveryAddress")}
        />
        {err("deliveryAddress")}
        {deliveryDays.length > 0 && (
          <p className="mt-1 text-xs text-muted">We deliver every {formatList(deliveryDays)}.</p>
        )}
      </div>

      <LocationPicker value={location} onChange={setLocation} />

      <fieldset {...a11y("payment")}>
        <legend className="mb-2 text-sm text-charcoal">Payment method</legend>
        <div className="grid gap-2">
          {PAYMENT_METHODS.map((method) => {
            const Icon = paymentIcons[method];
            return (
              <label
                key={method}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white px-3.5 py-3 transition-colors hover:border-brown/40 has-[:checked]:border-brown has-[:checked]:bg-brown/5"
              >
                <input
                  type="radio"
                  name={`${formId}-payment`}
                  value={method}
                  checked={payment === method}
                  onChange={() => setPayment(method)}
                  className="mt-1 accent-brown"
                />
                <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-deep" />
                <span>
                  <span className="block text-sm font-medium text-charcoal">{paymentMethodLabels[method]}</span>
                  <span className="block text-xs text-muted">{paymentHints[method]}</span>
                  {method === "ecocash" && ecocashFee > 0 && (
                    <span className="mt-1 inline-block rounded-full bg-blush-soft px-2 py-0.5 text-xs font-medium text-brown">
                      +{feeText} EcoCash fee
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
        {err("payment")}
      </fieldset>

      {payment === "ecocash" && (
        <div className="rounded-lg bg-sage-soft px-3.5 py-3 text-sm leading-relaxed text-charcoal">
          {ecocashFee > 0 && (
            <dl className="mb-3 space-y-1 border-b border-sage/40 pb-3">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Order total</dt>
                <dd className="tabular-nums">{totalToPay(false) ?? "Confirmed on WhatsApp"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">EcoCash fee</dt>
                <dd className="tabular-nums">+{feeText}</dd>
              </div>
              <div className="flex justify-between gap-3 font-semibold">
                <dt>Total to pay</dt>
                <dd className="tabular-nums">{totalToPay(true) ?? `Order total + ${feeText}`}</dd>
              </div>
            </dl>
          )}
          {ecocashNumber && <p className="font-medium">EcoCash number: <span className="tabular-nums">{ecocashNumber}</span></p>}
          <p className="mt-1 text-muted">
            {ecocashFee > 0 && <>Paying by EcoCash adds a {feeText} fee to your order. </>}
            After we confirm your order on WhatsApp, send {totalToPay(true) ?? "the confirmed total"}
            {ecocashNumber ? " to this number" : ""} and share the EcoCash confirmation message with us.
          </p>
        </div>
      )}

      <div>
        <label htmlFor={`${formId}-notes`} className="mb-1.5 block text-sm text-charcoal">
          Notes <span className="text-muted">(optional)</span>
        </label>
        <input
          id={`${formId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={input()}
        />
      </div>

      <button
        type="submit"
        disabled={!online}
        className={buttonClass({ variant: "whatsapp", size: "lg", block: true, className: !online ? "opacity-50" : undefined })}
      >
        <WhatsAppIcon size={18} />
        Place Order via WhatsApp
      </button>

      {!online ? (
        <p className="flex gap-2 text-sm text-muted">
          <WifiOff size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          You&apos;re offline. Reconnect to place your order.
        </p>
      ) : opened ? (
        <p role="status" className="rounded-lg bg-sage-soft px-3.5 py-3 text-sm leading-relaxed text-charcoal">
          WhatsApp should now be open with your order ready. Review it and tap send — your order is only placed once
          you send it in WhatsApp.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-muted">
          Opens WhatsApp with your order prefilled. We&apos;ll confirm availability, the total and your delivery day.
        </p>
      )}

      <details className="group rounded-lg border border-line bg-ivory/60">
        <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm text-charcoal marker:hidden hover:bg-cream/60 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Preview message</span>
          <span className="hidden group-open:inline">Hide preview</span>
        </summary>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-line px-3.5 py-3 font-sans text-xs leading-relaxed text-muted">
          {message}
        </pre>
      </details>
    </form>
  );
}
