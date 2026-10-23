"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAdminGrants, type ActionResult } from "@/app/actions/team";
import { GRANTABLE_PERMISSIONS, grantLabels, type GrantablePermission } from "@/lib/auth/roles";

/** Finance access tick boxes for a regular admin. Saved as soon as a box changes. */
export function TeamMemberGrants({ userId, name, grants }: { userId: string; name: string; grants: GrantablePermission[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<GrantablePermission[]>(grants);
  const [result, setResult] = useState<ActionResult | null>(null);

  function toggle(permission: GrantablePermission, on: boolean) {
    const next = on ? [...selected, permission] : selected.filter((value) => value !== permission);
    const previous = selected;
    setSelected(next);
    startTransition(async () => {
      const outcome = await setAdminGrants(userId, next);
      setResult(outcome);
      if (outcome.ok) router.refresh();
      else setSelected(previous); // Show what is actually saved.
    });
  }

  return (
    <fieldset className="mt-3 rounded-lg border border-line bg-ivory/60 px-3 py-2.5">
      <legend className="px-1 text-xs font-medium text-charcoal">Extra access for {name}</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
        {GRANTABLE_PERMISSIONS.map((permission) => (
          <label key={permission} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(permission)}
              disabled={pending}
              onChange={(event) => toggle(permission, event.target.checked)}
              className="mt-0.5 accent-brown"
            />
            <span>
              <span className="block text-charcoal">{grantLabels[permission].label}</span>
              <span className="block text-xs text-muted">{grantLabels[permission].description}</span>
            </span>
          </label>
        ))}
      </div>
      {result && !result.ok && (
        <p role="status" className="mt-2 text-xs text-danger">
          {result.message}
        </p>
      )}
    </fieldset>
  );
}
