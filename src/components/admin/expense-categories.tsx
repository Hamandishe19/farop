"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addExpenseCategory, deleteExpenseCategory, type ActionResult, type CategoryFormState } from "@/app/actions/finance";
import { buttonClass } from "@/components/ui/button-styles";
import type { ExpenseCategoryOption } from "@/types/finance";

/** Lists every expense category; admins who record finances can add their own and delete unused ones. */
export function ExpenseCategories({
  categories,
  usage,
  canRecord,
}: {
  categories: ExpenseCategoryOption[];
  /** Number of expenses (all time) using each category key. */
  usage: Record<string, number>;
  canRecord: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(addExpenseCategory, { status: "idle" });
  useEffect(() => {
    if (state.status === "added") router.refresh();
  }, [state, router]);

  const custom = categories.filter((category) => !category.builtIn);
  const builtIn = categories.filter((category) => category.builtIn);

  return (
    <div className="space-y-5">
      {canRecord && (
        <form action={action} className="space-y-2">
          <label htmlFor="new-category" className="block text-sm">New category</label>
          <div className="flex flex-wrap gap-2">
            <input
              id="new-category"
              name="name"
              maxLength={60}
              placeholder="e.g. Market stall fees"
              defaultValue={state.status === "error" ? state.name : undefined}
              aria-invalid={state.status === "error"}
              aria-describedby={state.status !== "idle" ? "new-category-result" : undefined}
              className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm"
            />
            <button type="submit" disabled={pending} className={buttonClass({ size: "sm" })}>
              <Plus size={14} aria-hidden="true" />
              {pending ? "Adding…" : "Add"}
            </button>
          </div>
          {state.status !== "idle" && (
            <p id="new-category-result" role="status" className={state.status === "added" ? "text-xs text-sage-deep" : "text-xs text-danger"}>
              {state.message}
            </p>
          )}
        </form>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Your categories</h3>
        {custom.length === 0 ? (
          <p className="text-sm text-muted">None yet.{canRecord && " Add one above for costs the built-in list doesn't cover."}</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {custom.map((category) => (
              <CustomCategoryRow key={category.key} category={category} uses={usage[category.key] ?? 0} canRecord={canRecord} />
            ))}
          </ul>
        )}
      </div>

      <details>
        <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted">
          Built-in categories ({builtIn.length})
        </summary>
        <ul className="mt-2 grid gap-1 text-sm text-charcoal">
          {builtIn.map((category) => (
            <li key={category.key} className="flex justify-between gap-3">
              {category.label}
              <span className="text-xs text-muted">{usage[category.key] ?? 0} used</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function CustomCategoryRow({ category, uses, canRecord }: { category: ExpenseCategoryOption; uses: number; canRecord: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const button = "rounded-md px-2 py-1 text-xs hover:bg-cream disabled:opacity-50";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      <span>
        <span className="text-charcoal">{category.label}</span>
        <span className="ml-2 text-xs text-muted">{uses === 1 ? "1 expense" : `${uses} expenses`}</span>
      </span>
      {canRecord &&
        (uses > 0 ? (
          <span className="text-xs text-muted">In use — kept for your history</span>
        ) : confirm ? (
          <span className="inline-flex gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const outcome = await deleteExpenseCategory(category.key);
                  setResult(outcome);
                  setConfirm(false);
                  if (outcome.ok) router.refresh();
                })
              }
              className={`${button} text-danger`}
            >
              Confirm delete
            </button>
            <button type="button" onClick={() => setConfirm(false)} className={button}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className={`${button} text-danger`}>
            Delete<span className="sr-only"> {category.label}</span>
          </button>
        ))}
      {result && !result.ok && (
        <p role="status" className="w-full text-xs text-danger">
          {result.message}
        </p>
      )}
    </li>
  );
}
