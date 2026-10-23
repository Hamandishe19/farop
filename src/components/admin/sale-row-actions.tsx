"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSale, setSaleStatus, type ActionResult } from "@/app/actions/finance";
import { SALE_STATUSES, saleStatusLabels, type SaleStatus } from "@/types/finance";

/** Status change, edit and delete for one recorded sale. Shows the server's actual result. */
export function SaleRowActions({ saleId, status, label }: { saleId: string; status: SaleStatus; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      setConfirmDelete(false);
      if (outcome.ok) router.refresh();
    });
  }

  const linkButton = "rounded-md px-2 py-1 text-xs hover:bg-cream disabled:opacity-50";

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-1">
        <label className="sr-only" htmlFor={`status-${saleId}`}>
          Status of {label}
        </label>
        <select
          id={`status-${saleId}`}
          value={status}
          disabled={pending}
          onChange={(event) => run(() => setSaleStatus(saleId, event.target.value))}
          className="rounded-md border border-line bg-white px-2 py-1 text-xs"
        >
          {SALE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {saleStatusLabels[value]}
            </option>
          ))}
        </select>
        <Link href={`/admin/finance/sales/${saleId}`} className={linkButton}>
          Edit<span className="sr-only"> {label}</span>
        </Link>
        {confirmDelete ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => deleteSale(saleId))} className={`${linkButton} text-danger`}>
              Confirm delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={linkButton}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${linkButton} text-danger`}>
            Delete<span className="sr-only"> {label}</span>
          </button>
        )}
      </div>
      {result && (
        <p role="status" className={`max-w-60 text-[0.7rem] leading-snug sm:text-right ${result.ok ? "text-sage-deep" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
