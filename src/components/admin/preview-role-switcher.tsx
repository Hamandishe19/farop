"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setPreviewRole } from "@/app/actions/team";
import { ADMIN_ROLES, roleLabels, type AdminRole } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

/** Development preview only: see the admin area as each role would. */
export function PreviewRoleSwitcher({ role }: { role: AdminRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 rounded-lg border border-dashed border-line p-3 lg:mt-6">
      <p className="mb-2 text-xs font-medium text-charcoal">Preview as</p>
      <div role="group" aria-label="Preview the admin area as" className="flex flex-wrap gap-1 lg:flex-col">
        {ADMIN_ROLES.slice()
          .reverse()
          .map((value) => (
            <button
              key={value}
              type="button"
              disabled={pending}
              aria-pressed={role === value}
              onClick={() =>
                startTransition(async () => {
                  await setPreviewRole(value);
                  router.refresh();
                })
              }
              className={cn(
                "rounded-md px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-60",
                role === value ? "bg-charcoal text-ivory" : "text-charcoal/80 hover:bg-white/70",
              )}
            >
              {roleLabels[value]}
            </button>
          ))}
      </div>
    </div>
  );
}
