/**
 * Data-quality checks on the product catalogue. Pure functions (no I/O) so
 * they run on any source — sample data or the database — and can be tested.
 */

import { disallowedCategories } from "../../config/product-types.ts";
import { isValidPrice } from "../format.ts";
import type { Product } from "../../types/product.ts";
import type { HealthCheck } from "./types.ts";

const MAX_ITEMS = 12;

function list(products: Product[]): string[] {
  const names = products.slice(0, MAX_ITEMS).map((product) => product.name);
  if (products.length > MAX_ITEMS) names.push(`…and ${products.length - MAX_ITEMS} more`);
  return names;
}

function check(
  id: string,
  label: string,
  offenders: Product[],
  messages: { ok: string; problem: (count: number) => string; fix: string },
  severity: "warn" | "fail" = "warn",
): HealthCheck {
  if (offenders.length === 0) return { id, label, status: "ok", detail: messages.ok };
  return {
    id,
    label,
    status: severity,
    detail: messages.problem(offenders.length),
    fix: messages.fix,
    items: list(offenders),
  };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function catalogueChecks(products: Product[], options: { production: boolean }): HealthCheck[] {
  const visible = products.filter((product) => product.active);
  const checks: HealthCheck[] = [];

  checks.push(
    visible.length > 0
      ? { id: "catalogue-visible", label: "Products on the website", status: "ok", detail: `${visible.length} of ${products.length} products are visible.` }
      : {
          id: "catalogue-visible",
          label: "Products on the website",
          status: "fail",
          detail: "No products are visible, so the shop looks empty.",
          fix: "Add products, or show hidden ones, in Admin → Products.",
        },
  );

  const slugCounts = new Map<string, number>();
  for (const product of products) slugCounts.set(product.slug, (slugCounts.get(product.slug) ?? 0) + 1);
  checks.push(
    check(
      "catalogue-slugs",
      "Unique product addresses",
      products.filter((product) => (slugCounts.get(product.slug) ?? 0) > 1),
      {
        ok: "Every product has its own URL.",
        problem: (n) => `${plural(n, "product shares", "products share")} a URL with another product, so one can't be opened.`,
        fix: "Give each product a different URL slug.",
      },
      "fail",
    ),
  );

  checks.push(
    check(
      "catalogue-rules",
      "Catalogue rules",
      products.filter((product) => disallowedCategories(product.type, product.categories).length > 0),
      {
        ok: "Every product's type is allowed in its categories.",
        problem: (n) => `${plural(n, "product is", "products are")} hidden from a category whose rules don't allow its type (e.g. bottoms in Girls).`,
        fix: "Edit the product's type or categories.",
      },
    ),
  );

  checks.push(
    check(
      "catalogue-uncategorised",
      "Products in a category",
      products.filter((product) => product.categories.length === 0),
      {
        ok: "Every product is in at least one category.",
        problem: (n) => `${plural(n, "product isn't", "products aren't")} in any category, so customers can't browse to them.`,
        fix: "Choose at least one category for each product.",
      },
    ),
  );

  checks.push(
    check(
      "catalogue-prices",
      "Prices",
      visible.filter((product) => !isValidPrice(product.price, product.currency)),
      {
        ok: "Every visible product has a price.",
        problem: (n) => `${plural(n, "visible product has", "visible products have")} no usable price, so cart totals can't be shown.`,
        fix: "Add a price (and currency) to each product.",
      },
    ),
  );

  checks.push(
    check(
      "catalogue-photos",
      "Photos",
      visible.filter((product) => !product.image),
      {
        ok: "Every visible product has a photo.",
        problem: (n) => `${plural(n, "visible product shows", "visible products show")} “Photo coming soon”.`,
        fix: "Upload a photo for each product.",
      },
    ),
  );

  const availableUnsized = visible.filter(
    (product) => product.type !== "accessories" && !product.sizes?.length && product.availability !== "out_of_stock",
  );
  checks.push(
    check("catalogue-sizes", "Sizes", availableUnsized, {
      ok: "Every visible clothing or shoe product lists its sizes.",
      problem: (n) => `${plural(n, "product has", "products have")} no sizes listed, so customers can't choose one.`,
      fix: "Add sizes (e.g. 0-3 months, 3-6 months) where they apply.",
    }),
  );

  const demo = products.filter((product) => product.isDemo);
  checks.push(
    demo.length === 0
      ? { id: "catalogue-samples", label: "Sample products", status: "ok", detail: "No sample products are in the catalogue." }
      : {
          id: "catalogue-samples",
          label: "Sample products",
          status: options.production ? "fail" : "warn",
          detail: `The catalogue is showing ${plural(demo.length, "sample product", "sample products")}, not real stock.`,
          fix: "Connect the database and add the real products.",
        },
  );

  return checks;
}
