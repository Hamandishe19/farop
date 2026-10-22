import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogueChecks } from "./catalogue-checks.ts";
import { countByStatus, overallStatus } from "./types.ts";
import type { Product } from "../../types/product.ts";

const base: Product = {
  id: "1",
  slug: "knit-hat",
  name: "Knit Hat",
  shortDescription: "A warm knitted hat.",
  categories: ["girls"],
  type: "accessories",
  condition: "new",
  price: 8,
  currency: "USD",
  image: { src: "/images/x.jpg", alt: "x", width: 1, height: 1 },
  active: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const byId = (products: Product[], production = false) =>
  Object.fromEntries(catalogueChecks(products, { production }).map((check) => [check.id, check]));

test("a clean catalogue passes every check", () => {
  const checks = catalogueChecks([base], { production: true });
  assert.equal(overallStatus(checks), "ok");
  assert.equal(countByStatus(checks).ok, checks.length);
});

test("problems are reported with the products involved", () => {
  const checks = byId([
    base,
    { ...base, id: "2", name: "Copy", price: undefined, image: undefined },
    { ...base, id: "3", name: "Trousers", slug: "trousers", type: "bottoms", categories: ["girls"] },
  ]);
  assert.equal(checks["catalogue-slugs"].status, "fail");
  assert.deepEqual(checks["catalogue-slugs"].items, ["Knit Hat", "Copy"]);
  assert.equal(checks["catalogue-prices"].status, "warn");
  assert.equal(checks["catalogue-photos"].status, "warn");
  assert.deepEqual(checks["catalogue-rules"].items, ["Trousers"]);
  assert.deepEqual(checks["catalogue-sizes"].items, ["Trousers"], "accessories don't need sizes");
});

test("sample data and an empty shop are flagged", () => {
  assert.equal(byId([{ ...base, isDemo: true }], true)["catalogue-samples"].status, "fail");
  assert.equal(byId([{ ...base, isDemo: true }], false)["catalogue-samples"].status, "warn");
  assert.equal(byId([{ ...base, active: false }])["catalogue-visible"].status, "fail");
  assert.equal(overallStatus([]), "skip");
});
