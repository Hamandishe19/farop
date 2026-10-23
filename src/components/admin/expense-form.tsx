"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { deleteExpense, saveExpense, type ActionResult, type ExpenseFormState } from "@/app/actions/finance";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import type { ExpenseCategoryOption } from "@/types/finance";

/** Quick "add an expense" form. */
export function ExpenseForm({ today, categories }: { today: string; categories: ExpenseCategoryOption[] }) {
  const [state, action, pending] = useActionState<ExpenseFormState, FormData>(saveExpense, { status: "idle" });
  const values = state.status === "invalid" || state.status === "refused" ? state.values : undefined;
  const errors = state.status === "invalid" ? state.errors : {};
  const router = useRouter();
  useEffect(() => {
    if (state.status === "saved") router.refresh();
  }, [state, router]);

  const input = (error?: string) =>
    cn(
      "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-charcoal focus:border-sage-deep",
      error ? "border-danger/60" : "border-line",
    );

  return (
    <form action={action} noValidate className="space-y-4">
      {state.status === "refused" && (
        <p role="alert" className="flex gap-2 rounded-lg bg-blush-soft px-4 py-3 text-sm text-charcoal">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          {state.message}
        </p>
      )}
      {state.status === "saved" && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-sage-soft px-4 py-3 text-sm text-charcoal">
          <CheckCircle2 size={16} aria-hidden="true" className="text-sage-deep" />
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[0.9fr_1.4fr_0.8fr_1.6fr]">
        <div>
          <label htmlFor="spentOn" className="mb-1.5 block text-sm">Date</label>
          <input id="spentOn" name="spentOn" type="date" defaultValue={values?.spentOn ?? today} className={input(errors.spentOn)} />
          {errors.spentOn && <p className="mt-1 text-xs text-danger">{errors.spentOn}</p>}
        </div>
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm">Category</label>
          <select id="category" name="category" defaultValue={values?.category ?? ""} className={input(errors.category)}>
            <option value="" disabled>Choose…</option>
            <optgroup label="Built-in">
              {categories.filter((category) => category.builtIn).map((category) => (
                <option key={category.key} value={category.key}>{category.label}</option>
              ))}
            </optgroup>
            {categories.some((category) => !category.builtIn) && (
              <optgroup label="Your categories">
                {categories.filter((category) => !category.builtIn).map((category) => (
                  <option key={category.key} value={category.key}>{category.label}</option>
                ))}
              </optgroup>
            )}
          </select>
          {errors.category && <p className="mt-1 text-xs text-danger">{errors.category}</p>}
        </div>
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm">Amount</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder="0.00" defaultValue={values?.amount} className={input(errors.amount)} />
          {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount}</p>}
        </div>
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm">
            What for <span className="text-muted">(optional)</span>
          </label>
          <input id="description" name="description" placeholder="e.g. Fuel for Saturday deliveries" defaultValue={values?.description} className={input()} />
        </div>
      </div>
      <button type="submit" disabled={pending} className={buttonClass({ size: "sm" })}>
        {pending ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}

export function DeleteExpenseButton({ expenseId, label }: { expenseId: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const button = "rounded-md px-2 py-1 text-xs hover:bg-cream disabled:opacity-50";

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {confirm ? (
        <span className="inline-flex gap-1">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const outcome = await deleteExpense(expenseId);
                setResult(outcome);
                setConfirm(false);
                if (outcome.ok) router.refresh();
              })
            }
            className={`${button} text-danger`}
          >
            Confirm
          </button>
          <button type="button" onClick={() => setConfirm(false)} className={button}>
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className={`${button} text-danger`}>
          Delete<span className="sr-only"> {label}</span>
        </button>
      )}
      {result && !result.ok && <span role="status" className="max-w-48 text-right text-[0.7rem] text-danger">{result.message}</span>}
    </span>
  );
}
