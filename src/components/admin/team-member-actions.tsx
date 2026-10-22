"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeAdminRole, removeAdmin, type ActionResult } from "@/app/actions/team";
import { roleLabels, type AdminRole } from "@/lib/auth/roles";

/** Change role / remove, for an admin the current user is allowed to manage. */
export function TeamMemberActions({
  userId,
  name,
  role,
  assignable,
}: {
  userId: string;
  name: string;
  role: AdminRole;
  /** Roles the current admin may give. */
  assignable: AdminRole[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      setConfirmRemove(false);
      if (outcome.ok) router.refresh();
    });
  }

  const linkButton = "rounded-md px-2 py-1 text-xs hover:bg-cream disabled:opacity-50";

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap items-center gap-1">
        <label className="sr-only" htmlFor={`role-${userId}`}>
          Role for {name}
        </label>
        <select
          id={`role-${userId}`}
          value={role}
          disabled={pending}
          onChange={(event) => run(() => changeAdminRole(userId, event.target.value))}
          className="rounded-md border border-line bg-white px-2 py-1 text-xs"
        >
          {assignable.map((value) => (
            <option key={value} value={value}>
              {roleLabels[value]}
            </option>
          ))}
        </select>
        {confirmRemove ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => removeAdmin(userId))} className={`${linkButton} text-danger`}>
              Confirm remove
            </button>
            <button type="button" onClick={() => setConfirmRemove(false)} className={linkButton}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" disabled={pending} onClick={() => setConfirmRemove(true)} className={`${linkButton} text-danger`}>
            Remove<span className="sr-only"> {name}</span>
          </button>
        )}
      </div>
      {result && (
        <p role="status" className={`max-w-64 text-[0.7rem] leading-snug sm:text-right ${result.ok ? "text-sage-deep" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
