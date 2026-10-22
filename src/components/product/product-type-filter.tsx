"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { conditionLabels } from "@/lib/product-display";
import { PRODUCT_CONDITIONS, type ProductCondition } from "@/types/product";

export interface TypeOption {
  value: string;
  label: string;
}

type ConditionFilter = "all" | ProductCondition;

/**
 * Catalogue filters: a condition toggle ("All", "Brand new", "Preloved") and
 * a garment-type filter ("All", "Tops", "Bottoms", …). Product cards are
 * rendered on the server and passed in; filtering only toggles which ones
 * are visible.
 */
export function ProductTypeFilter({
  options,
  items,
}: {
  options: TypeOption[];
  items: Array<{ id: string; type: string; condition: ProductCondition; node: ReactNode }>;
}) {
  const [condition, setCondition] = useState<ConditionFilter>("all");
  const [selected, setSelected] = useState<string>("all");
  const gridId = useId();

  const byCondition = condition === "all" ? items : items.filter((item) => item.condition === condition);
  const visible = selected === "all" ? byCondition : byCondition.filter((item) => item.type === selected);
  const showTypeFilter = options.length > 1;

  const conditionOptions: Array<{ value: ConditionFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: items.length },
    ...PRODUCT_CONDITIONS.map((value) => ({
      value,
      label: conditionLabels[value],
      count: items.filter((item) => item.condition === value).length,
    })),
  ];

  const pill = (active: boolean) =>
    cn(
      "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm transition-colors",
      active ? "border-brown bg-brown text-ivory" : "border-line bg-white/50 text-charcoal hover:border-brown/40",
    );

  const segment = (active: boolean) =>
    cn(
      "inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm transition-colors sm:flex-none sm:px-4",
      active ? "bg-charcoal text-ivory shadow-sm" : "text-charcoal hover:bg-white",
    );

  const conditionText = condition === "all" ? "" : `${conditionLabels[condition].toLowerCase()} `;
  const typeText = selected === "all" ? "pieces" : (options.find((option) => option.value === selected)?.label ?? "pieces");

  return (
    <>
      <div className="mb-10 space-y-4">
        <div role="group" aria-label="Filter by condition" className="flex w-full rounded-full border border-line bg-cream/60 p-1 sm:inline-flex sm:w-auto">
          {conditionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-controls={gridId}
              aria-pressed={condition === option.value}
              onClick={() => setCondition(option.value)}
              className={segment(condition === option.value)}
            >
              {option.label} <span className="text-xs opacity-70">{option.count}</span>
            </button>
          ))}
        </div>

        {showTypeFilter && (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul role="group" aria-label="Filter by type" className="flex gap-2">
              <li>
                <button type="button" aria-controls={gridId} aria-pressed={selected === "all"} onClick={() => setSelected("all")} className={pill(selected === "all")}>
                  All <span className="text-xs opacity-70">{byCondition.length}</span>
                </button>
              </li>
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    aria-controls={gridId}
                    aria-pressed={selected === option.value}
                    onClick={() => setSelected(option.value)}
                    className={pill(selected === option.value)}
                  >
                    {option.label}{" "}
                    <span className="text-xs opacity-70">{byCondition.filter((item) => item.type === option.value).length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {`Showing ${visible.length} ${conditionText}${typeText}`}
      </p>

      {visible.length === 0 ? (
        <p id={gridId} className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          No {conditionText}{typeText.toLowerCase()} in this collection right now.
        </p>
      ) : (
        <ul id={gridId} className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {visible.map((item) => (
            <li key={item.id}>{item.node}</li>
          ))}
        </ul>
      )}
    </>
  );
}
