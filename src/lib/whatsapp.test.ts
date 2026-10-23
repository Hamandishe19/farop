import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderMessage,
  buildProductEnquiryMessage,
  buildWhatsAppUrl,
  calculateTotals,
  normaliseWhatsAppNumber,
  type OrderDetails,
} from "./whatsapp.ts";

test("normalises international numbers and rejects placeholders", () => {
  assert.equal(normaliseWhatsAppNumber("+263 77 123 4567"), "263771234567");
  assert.equal(normaliseWhatsAppNumber("00263-77-123-4567"), "263771234567");
  assert.equal(normaliseWhatsAppNumber("+263 (0)77 123 4567"), "263771234567");
  assert.equal(normaliseWhatsAppNumber(""), undefined);
  assert.equal(normaliseWhatsAppNumber("YOUR_NUMBER_HERE"), undefined);
  assert.equal(normaliseWhatsAppNumber("0771234567"), undefined, "leading zero = no country code");
  assert.equal(normaliseWhatsAppNumber(undefined), undefined);
});

test("does not build a link without a valid number", () => {
  assert.equal(buildWhatsAppUrl(undefined, "hi"), undefined);
  assert.equal(buildWhatsAppUrl("123", "hi"), undefined);
});

test("URL-encodes the message", () => {
  const url = buildWhatsAppUrl("263771234567", "Hello & thanks\n1. Item #2");
  assert.equal(url, "https://wa.me/263771234567?text=Hello%20%26%20thanks%0A1.%20Item%20%232");
});

const cod: OrderDetails = { payment: "cod", customerName: " Rudo M ", deliveryAddress: "12 Main St, Harare" };

test("order without prices asks to confirm the total and never prints undefined", () => {
  const message = buildOrderMessage(
    [
      { name: "Baby Cotton Outfit", quantity: 2, size: "6-12 months" },
      { name: "Baby Shoes", quantity: 1 },
    ],
    cod,
  );
  assert.match(message, /I would like to place an order/);
  assert.match(message, /1\. Baby Cotton Outfit\n {3}Quantity: 2\n {3}Size: 6-12 months/);
  assert.match(message, /2\. Baby Shoes\n {3}Quantity: 1\n\n/);
  assert.match(message, /Order total: please confirm/);
  assert.match(message, /Payment: Cash on delivery\nName: Rudo M\nDelivery address: 12 Main St, Harare\n\n/);
  assert.doesNotMatch(message, /undefined|NaN|Notes:|quotation/i);
});

test("EcoCash orders include the payment number; notes only when given", () => {
  const message = buildOrderMessage(
    [{ name: "Knit Hat", quantity: 1 }],
    { ...cod, payment: "ecocash", notes: "Please call before delivery" },
    { ecocashNumber: "077 477 3122" },
  );
  assert.match(message, /Payment: EcoCash to 077 477 3122 \(I will pay once you confirm my order\)/);
  assert.match(message, /Notes: Please call before delivery/);
});

test("details not filled in yet are left out of the order message", () => {
  const message = buildOrderMessage([{ name: "Knit Hat", quantity: 1 }], { customerName: " ", deliveryAddress: "" });
  assert.doesNotMatch(message, /Payment:|Name:|Delivery address:|Delivery location|undefined/);
});

test("a map pin adds a Google Maps link after the address", () => {
  const message = buildOrderMessage([{ name: "Knit Hat", quantity: 1 }], {
    ...cod,
    location: { lat: -17.8292, lng: 31.0522 },
  });
  assert.match(
    message,
    /Delivery address: 12 Main St, Harare\nDelivery location \(map\): https:\/\/www\.google\.com\/maps\?q=-17\.829200,31\.052200\n/,
  );
});

test("total only when every line is reliably priced in one currency", () => {
  const priced = [
    { name: "A", quantity: 2, unitPrice: 10.1, currency: "USD" },
    { name: "B", quantity: 1, unitPrice: 5, currency: "USD" },
  ];
  assert.deepEqual(calculateTotals(priced), { subtotal: 25.2, currency: "USD", totalQuantity: 3 });
  assert.match(buildOrderMessage(priced, cod), /Order total: \$25\.20/);

  const mixed = [priced[0], { name: "C", quantity: 1 }];
  assert.equal(calculateTotals(mixed).subtotal, undefined);
  assert.match(buildOrderMessage(mixed, cod), /Order total: please confirm/);

  const currencies = [priced[0], { name: "D", quantity: 1, unitPrice: 3, currency: "ZAR" }];
  assert.equal(calculateTotals(currencies).subtotal, undefined);
});

test("product enquiry includes only supplied details", () => {
  const message = buildProductEnquiryMessage({ productName: "Knit Hat" });
  assert.doesNotMatch(message, /Size:|Option:|Link:|undefined/);
  const full = buildProductEnquiryMessage({
    productName: "Knit Hat",
    size: "0-3 months",
    productUrl: "https://example.com/products/knit-hat",
  });
  assert.match(full, /Size: 0-3 months/);
  assert.match(full, /Link: https:\/\/example\.com\/products\/knit-hat/);
});

test("EcoCash orders show the fee and the total to pay", () => {
  const lines = [{ name: "Knit Hat", quantity: 2, unitPrice: 8, currency: "USD" }];
  const message = buildOrderMessage(lines, { ...cod, payment: "ecocash" }, { ecocashFee: 1 });
  assert.match(message, /Order total: \$16\.00\nEcoCash fee: \$1\.00\nTotal to pay: \$17\.00/);

  assert.doesNotMatch(buildOrderMessage(lines, cod, { ecocashFee: 1 }), /EcoCash fee/, "no fee for cash on delivery");
  assert.match(
    buildOrderMessage([{ name: "Hat", quantity: 1 }], { ...cod, payment: "ecocash" }, { ecocashFee: 1, currency: "USD" }),
    /Order total: please confirm\nEcoCash fee: \$1\.00 \(added to the total\)/,
  );
});
