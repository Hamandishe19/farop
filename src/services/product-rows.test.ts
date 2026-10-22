import { test } from "node:test";
import assert from "node:assert/strict";
import { formToRow, productToRow, rowToProduct, type ProductRow } from "./product-rows.ts";
import type { ProductFormValues } from "../lib/validation/product.ts";

const row: ProductRow = {
  id: "0b6c1f8e-3c1a-4f6e-9a55-2d1d8c9f0a11",
  slug: "knit-hat",
  name: "Knit Hat",
  short_description: "A warm knitted hat.",
  description: null,
  categories: ["girls", "winterwear"],
  type: "accessories",
  condition: "preloved",
  price: "7.50",
  currency: "USD",
  sizes: [],
  availability: null,
  image_url: "https://abc.supabase.co/storage/v1/object/public/product-images/knit-hat-1.jpg",
  image_alt: null,
  active: true,
  featured: false,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
};

test("database rows become products: numeric price, unknown categories dropped, alt falls back to name", () => {
  const product = rowToProduct(row);
  assert.equal(product.price, 7.5);
  assert.deepEqual(product.categories, ["girls"]);
  assert.equal(product.sizes, undefined);
  assert.equal(product.description, undefined);
  assert.equal(product.image?.alt, "Knit Hat");
  assert.equal(rowToProduct({ ...row, price: null, image_url: null }).image, undefined);
});

test("admin form values become a row: sizes split, blank price clears currency", () => {
  const values: ProductFormValues = {
    name: "Knit Hat",
    slug: "knit-hat",
    shortDescription: "A warm knitted hat.",
    description: "",
    categories: ["girls"],
    type: "accessories",
    condition: "new",
    price: "",
    currency: "USD",
    sizes: " 0-3 months, ,3-6 months ",
    availability: "",
    imageSrc: "",
    imageAlt: "",
    active: true,
    featured: false,
  };
  const out = formToRow(values, undefined);
  assert.deepEqual(out.sizes, ["0-3 months", "3-6 months"]);
  assert.equal(out.price, null);
  assert.equal(out.currency, null);
  assert.equal(out.description, null);
  assert.equal(out.image_url, null);

  const priced = formToRow({ ...values, price: "12.345" }, "https://x/y.jpg");
  assert.equal(priced.price, 12.35);
  assert.equal(priced.currency, "USD");
  assert.equal(priced.image_alt, "Knit Hat");
});

test("sample products round-trip through a row", () => {
  const product = rowToProduct(row);
  const back = productToRow(product);
  assert.equal(back.slug, "knit-hat");
  assert.equal(back.price, 7.5);
  assert.equal(back.currency, "USD");
});
