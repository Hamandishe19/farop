import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedTypesFor, belongsInCategory, disallowedCategories } from "./product-types.ts";
import { validateProduct, type ProductFormValues } from "../lib/validation/product.ts";

test("girls have no bottoms; boys have bottoms but no dresses", () => {
  assert.ok(!allowedTypesFor("girls").includes("bottoms"));
  assert.ok(allowedTypesFor("girls").includes("dresses"));
  assert.ok(allowedTypesFor("boys").includes("bottoms"));
  assert.ok(!allowedTypesFor("boys").includes("dresses"));
  assert.deepEqual(disallowedCategories("bottoms", ["babywear", "girls"]), ["girls"]);
});

test("a mislabelled product is kept out of a catalogue that disallows its type", () => {
  const trousers = { categories: ["girls", "babywear"] as const, type: "bottoms" as const };
  assert.equal(belongsInCategory({ ...trousers, categories: [...trousers.categories] }, "girls"), false);
  assert.equal(belongsInCategory({ ...trousers, categories: [...trousers.categories] }, "babywear"), true);
});

test("admin validation rejects a type not allowed in a chosen category", () => {
  const base: ProductFormValues = {
    name: "Cord Trousers",
    slug: "cord-trousers",
    shortDescription: "Soft trousers for everyday wear.",
    description: "",
    categories: ["girls"],
    type: "bottoms",
    condition: "new",
    price: "",
    currency: "",
    sizes: "",
    availability: "",
    imageSrc: "",
    imageAlt: "",
    active: true,
    featured: false,
  };
  assert.match(validateProduct(base).type ?? "", /can't be listed under: girls/);
  assert.equal(validateProduct({ ...base, categories: ["boys"] }).type, undefined);
  assert.equal(validateProduct({ ...base, type: "" }).type, "Choose a product type.");
});

test("admin validation requires a condition", () => {
  const values: ProductFormValues = {
    name: "Knit Cardigan",
    slug: "knit-cardigan",
    shortDescription: "A soft knit cardigan for cooler days.",
    description: "",
    categories: ["babywear"],
    type: "outerwear",
    condition: "",
    price: "",
    currency: "",
    sizes: "",
    availability: "",
    imageSrc: "",
    imageAlt: "",
    active: true,
    featured: false,
  };
  assert.equal(validateProduct(values).condition, "Choose brand new or preloved.");
  assert.equal(validateProduct({ ...values, condition: "preloved" }).condition, undefined);
});

