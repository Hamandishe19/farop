"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Globe, RefreshCw, RotateCcw } from "lucide-react";
import { refreshSiteData, runPageChecks, type PageCheckResult } from "@/app/actions/system";
import { HealthCheckRow, StatusPill } from "@/components/admin/health-check-row";
import { buttonClass } from "@/components/ui/button-styles";
import { countByStatus, overallStatus } from "@/lib/health/types";

/** Re-runs all checks on the System page. */
export function RerunChecksButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={buttonClass({ variant: "secondary", size: "sm" })}
    >
      <RefreshCw size={14} aria-hidden="true" className={pending ? "animate-spin" : undefined} />
      {pending ? "Checking…" : "Run checks again"}
    </button>
  );
}

/** Loads every public page and lists status and response time. */
export function PageChecks() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PageCheckResult | null>(null);
  const checks = result?.ok ? result.checks : [];
  const counts = countByStatus(checks);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Globe size={15} aria-hidden="true" />
            Website pages
            {checks.length > 0 && <StatusPill status={overallStatus(checks)} />}
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {checks.length > 0
              ? `${counts.ok} loaded · ${counts.warn} slow · ${counts.fail} failed`
              : "Loads every public page the way a customer would."}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setResult(await runPageChecks()))}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          {pending ? "Checking pages…" : checks.length > 0 ? "Check again" : "Check all pages"}
        </button>
      </div>
      {result && !result.ok && <p className="px-5 pb-4 text-sm text-danger">{result.message}</p>}
      {checks.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {checks.map((check) => (
            <HealthCheckRow key={check.id} check={check} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Clears cached products, categories and settings. */
export function RefreshDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="max-w-xl">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <RotateCcw size={15} aria-hidden="true" />
          Refresh site data
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          {result?.message ??
            "Clears the cached products, categories and settings. Use it if a change made directly in the database isn't showing on the website."}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const outcome = await refreshSiteData();
            setResult(outcome);
            if (outcome.ok) router.refresh();
          })
        }
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        {pending ? "Refreshing…" : "Refresh now"}
      </button>
    </div>
  );
}
