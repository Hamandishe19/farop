import { test } from "node:test";
import assert from "node:assert/strict";
import { diffFields, displayValue } from "./changes.ts";

test("values read as plain text, blanks as null", () => {
  assert.equal(displayValue(""), null);
  assert.equal(displayValue(undefined), null);
  assert.equal(displayValue(true), "Yes");
  assert.equal(displayValue(12.5), "12.5");
  assert.equal(displayValue(["boys", "girls"]), "boys, girls");
  assert.equal(
    displayValue([
      { days: "Monday", time: "08:00" },
      { days: "Sunday", time: "Closed" },
    ]),
    "Monday 08:00; Sunday Closed",
  );
  assert.equal(displayValue("x".repeat(500))?.length, 200);
});

test("only changed, labelled fields are reported, in label order", () => {
  const changes = diffFields(
    { name: "Dress", price: 10, sizes: ["2"], secret: 1 },
    { name: "Dress", price: 12, sizes: ["2", "3"], secret: 2 },
    { sizes: "Sizes", price: "Price", name: "Name" },
  );
  assert.deepEqual(changes, [
    { field: "Sizes", from: "2", to: "2, 3" },
    { field: "Price", from: "10", to: "12" },
  ]);
});

test("hidden fields are reported as changed without their values", () => {
  assert.deepEqual(diffFields({ image_url: "a.jpg" }, { image_url: "b.jpg" }, { image_url: "Photo" }, ["image_url"]), [
    { field: "Photo", from: null, to: null },
  ]);
});
