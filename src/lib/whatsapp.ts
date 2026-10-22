/**
 * WhatsApp click-to-chat helpers.
 *
 * Builds order and enquiry messages from real data only — missing
 * values are omitted rather than printed as "undefined" or guessed.
 * The customer always reviews and sends the message themselves.
 */

import { paymentMethodLabels, type PaymentMethod } from "../config/payments.ts";
import type { CartLine } from "../types/cart.ts";
import { formatPrice, isValidPrice, multiplyPrice } from "./format.ts";

/**
 * Normalise a phone number to the digits-only international format wa.me
 * expects (country code, no "+", spaces or leading zeros).
 * Returns undefined for anything that is not a plausible E.164 number.
 */
export function normaliseWhatsAppNumber(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const digits = value
    .trim()
    .replace(/\(0\)/g, "") // "+263 (0)77…": the bracketed trunk 0 is dropped in international format
    .replace(/^\+/, "")
    .replace(/^00/, "")
    .replace(/[\s().-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return undefined;
  return digits;
}

export function buildWhatsAppUrl(number: string | undefined, message: string): string | undefined {
  const normalised = normaliseWhatsAppNumber(number);
  if (!normalised) return undefined;
  return `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`;
}

export type OrderLine = Pick<
  CartLine,
  "name" | "quantity" | "size" | "variantLabel" | "unitPrice" | "currency"
>;

export interface OrderTotals {
  /** Present only when every line has a valid price in the same currency. */
  subtotal?: number;
  currency?: string;
  totalQuantity: number;
}

export function calculateTotals(lines: OrderLine[]): OrderTotals {
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (lines.length === 0) return { totalQuantity };

  const currency = lines[0].currency;
  const reliable = lines.every(
    (line) => isValidPrice(line.unitPrice, line.currency) && line.currency === currency,
  );
  if (!reliable || !currency) return { totalQuantity };

  const subtotal = lines.reduce(
    (sum, line) => sum + multiplyPrice(line.unitPrice as number, line.quantity),
    0,
  );
  return { subtotal: Math.round(subtotal * 100) / 100, currency, totalQuantity };
}

export interface MapLocation {
  lat: number;
  lng: number;
}

/** Google Maps link to a point — opens the Maps app on most phones. */
export function mapsUrl({ lat, lng }: MapLocation): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Fields the customer has not filled in yet are left out of the message. */
export interface OrderDetails {
  payment?: PaymentMethod;
  customerName: string;
  deliveryAddress: string;
  /** Delivery pin chosen on the map, if any. */
  location?: MapLocation;
  notes?: string;
}

export function buildOrderMessage(
  lines: OrderLine[],
  details: OrderDetails,
  options: { businessName?: string; ecocashNumber?: string } = {},
): string {
  const greeting = options.businessName ? `Hello ${options.businessName}!` : "Hello!";
  const out: string[] = [greeting, "I would like to place an order for the following:", ""];

  lines.forEach((line, index) => {
    out.push(`${index + 1}. ${line.name}`);
    out.push(`   Quantity: ${line.quantity}`);
    if (line.size) out.push(`   Size: ${line.size}`);
    if (line.variantLabel) out.push(`   Option: ${line.variantLabel}`);
    if (isValidPrice(line.unitPrice, line.currency)) {
      out.push(`   Price: ${formatPrice(line.unitPrice, line.currency as string)} each`);
    }
    out.push("");
  });

  const totals = calculateTotals(lines);
  if (totals.subtotal !== undefined && totals.currency) {
    out.push(`Order total: ${formatPrice(totals.subtotal, totals.currency)}`);
  } else {
    out.push("Order total: please confirm");
  }
  out.push("");

  if (details.payment === "ecocash") {
    const to = options.ecocashNumber ? ` to ${options.ecocashNumber}` : "";
    out.push(`Payment: EcoCash${to} (I will pay once you confirm my order)`);
  } else if (details.payment) {
    out.push(`Payment: ${paymentMethodLabels[details.payment]}`);
  }
  if (details.customerName.trim()) out.push(`Name: ${details.customerName.trim()}`);
  if (details.deliveryAddress.trim()) out.push(`Delivery address: ${details.deliveryAddress.trim()}`);
  if (details.location) out.push(`Delivery location (map): ${mapsUrl(details.location)}`);
  if (details.notes?.trim()) out.push(`Notes: ${details.notes.trim()}`);
  out.push("");
  out.push("Please confirm my order and the delivery day.");
  out.push("Thank you.");

  return out.join("\n");
}

export interface ProductEnquiry {
  productName: string;
  productUrl?: string;
  size?: string;
  variantLabel?: string;
  question?: string;
}

export function buildProductEnquiryMessage(enquiry: ProductEnquiry): string {
  const out = ["Hello!", `I have a question about this product: ${enquiry.productName}`];
  if (enquiry.size) out.push(`Size: ${enquiry.size}`);
  if (enquiry.variantLabel) out.push(`Option: ${enquiry.variantLabel}`);
  if (enquiry.productUrl) out.push(`Link: ${enquiry.productUrl}`);
  out.push("");
  out.push(enquiry.question?.trim() || "Could you please confirm availability and sizing?");
  out.push("Thank you.");
  return out.join("\n");
}

export interface GeneralEnquiry {
  name: string;
  category?: string;
  message: string;
}

export function buildGeneralEnquiryMessage(enquiry: GeneralEnquiry): string {
  const out = [`Hello! My name is ${enquiry.name}.`];
  if (enquiry.category) out.push(`Enquiry: ${enquiry.category}`);
  out.push("", enquiry.message.trim());
  return out.join("\n");
}
