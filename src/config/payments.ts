/**
 * Payment options offered at checkout.
 *
 * Orders are sent on WhatsApp; no payment is taken on the website. Customers
 * pay cash when their order is delivered, or by EcoCash once the order has
 * been confirmed. The EcoCash number is a business setting (getSettings()).
 */

export const PAYMENT_METHODS = ["cod", "ecocash"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  ecocash: "EcoCash",
};
