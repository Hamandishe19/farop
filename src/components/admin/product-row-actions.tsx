"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct, setProductActive } from "@/app/actions/admin";

/** Activate/deactivate and delete. Results come from the server — nothing is assumed to succeed. */
export function ProductRowActions({
  id,
  name,
  active,
  canDelete,
}: {
  id: string;
  name: string;
  active: boolean;
  /** Supreme and developer admins only. */
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      setConfirmDelete(false);
      if (outcome.ok) router.refresh();
    });
  }

  const linkButton = "rounded-md px-2 py-1 text-xs hover:bg-cream disabled:opacity-50";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button type="button" disabled={pending} onClick={() => run(() => setProductActive(id, !active))} className={linkButton}>
          {active ? "Hide" : "Show"}
          <span className="sr-only"> {name}</span>
        </button>
        {canDelete &&
          (confirmDelete ? (
            <>
              <button type="button" disabled={pending} onClick={() => run(() => deleteProduct(id))} className={`${linkButton} text-danger`}>
                Confirm delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={linkButton}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" disabled={pending} onClick={() => setConfirmDelete(true)} className={`${linkButton} text-danger`}>
              Delete<span className="sr-only"> {name}</span>
            </button>
          ))}
      </div>
      {result && (
        <p
          role="status"
          className={`max-w-56 text-right text-[0.7rem] leading-snug ${result.ok ? "text-sage-deep" : "text-danger"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
