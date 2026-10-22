import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CART,
  addLine,
  parseStoredCart,
  reconcileCart,
  removeLine,
  setLineQuantity,
  totalQuantity,
} from "./cart.ts";

const base = { productId: "p1", slug: "p1", name: "Bodysuit" };

test("merges identical product + size and keeps sizes distinct", () => {
  let cart = addLine(EMPTY_CART, { ...base, size: "0-3 months" });
  cart = addLine(cart, { ...base, size: "0-3 months", quantity: 2 });
  cart = addLine(cart, { ...base, size: "3-6 months" });
  assert.equal(cart.lines.length, 2);
  assert.equal(cart.lines[0].quantity, 3);
  assert.equal(totalQuantity(cart), 4);
});

test("quantity is clamped and zero removes the line", () => {
  let cart = addLine(EMPTY_CART, { ...base, quantity: 500 });
  assert.equal(cart.lines[0].quantity, 99);
  cart = setLineQuantity(cart, cart.lines[0].key, 2.7);
  assert.equal(cart.lines[0].quantity, 2);
  cart = setLineQuantity(cart, cart.lines[0].key, 0);
  assert.equal(cart.lines.length, 0);
  assert.deepEqual(removeLine(EMPTY_CART, "missing"), EMPTY_CART);
});

test("malformed or outdated storage is handled gracefully", () => {
  assert.deepEqual(parseStoredCart(null), EMPTY_CART);
  assert.deepEqual(parseStoredCart("{not json"), EMPTY_CART);
  assert.deepEqual(parseStoredCart(JSON.stringify({ version: 0, lines: [] })), EMPTY_CART);
  const parsed = parseStoredCart(
    JSON.stringify({
      version: 1,
      lines: [
        { ...base, quantity: 2, unitPrice: "free" },
        { productId: "bad", quantity: 1 },
        { ...base, quantity: -4 },
        null,
      ],
    }),
  );
  assert.equal(parsed.lines.length, 1);
  assert.equal(parsed.lines[0].quantity, 2);
  assert.equal(parsed.lines[0].unitPrice, undefined);
});

test("reconcile refreshes from catalogue and drops unavailable lines", () => {
  let cart = addLine(EMPTY_CART, { ...base, name: "Old name", unitPrice: 1, currency: "USD" });
  cart = addLine(cart, { productId: "gone", slug: "gone", name: "Gone" });
  cart = addLine(cart, { productId: "p2", slug: "p2", name: "Shoe", size: "XL" });
  const catalogue = new Map([
    ["p1", { id: "p1", slug: "p1", name: "Bodysuit" }],
    ["p2", { id: "p2", slug: "p2", name: "Shoe", sizes: ["S"] }],
  ]);
  const { state, removed } = reconcileCart(cart, catalogue);
  assert.equal(state.lines.length, 1);
  assert.equal(state.lines[0].name, "Bodysuit");
  assert.equal(state.lines[0].unitPrice, undefined, "client price is never trusted");
  assert.deepEqual(removed, ["Gone", "Shoe"]);
});
