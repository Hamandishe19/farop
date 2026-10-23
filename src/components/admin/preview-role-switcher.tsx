"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setPreviewRole } from "@/app/actions/team";
import { roleLabels, type AdminRole } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

const options: Array<{ value: string; label: string }> = [
  { value: "developer", label: roleLabels.developer },
  { value: "supreme", label: roleLabels.supreme },
  { value: "regular", label: roleLabels.regular },
  // Must match PREVIEW_REGULAR_WITH_FINANCE in src/lib/auth/admin.ts (server-only).
  { value: "regular-finance", label: "Regular + finance access" },
];

/** Development preview only: see the admin area as each role would. */
export function PreviewRoleSwitcher({ role, hasFinanceGrant }: { role: AdminRole; hasFinanceGrant: boolean }) {
  const current = role === "regular" && hasFinanceGrant ? "regular-finance" : role;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 rounded-lg border border-dashed border-line p-3 lg:mt-6">
      <p className="mb-2 text-xs font-medium text-charcoal">Preview as</p>
      <div role="group" aria-label="Preview the admin area as" className="flex flex-wrap gap-1 lg:flex-col">
        {options.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={current === value}
            onClick={() =>
              startTransition(async () => {
                await setPreviewRole(value);
                router.refresh();
              })
            }
            className={cn(
              "rounded-md px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-60",
              current === value ? "bg-charcoal text-ivory" : "text-charcoal/80 hover:bg-white/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
