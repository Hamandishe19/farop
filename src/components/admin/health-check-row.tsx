import { CheckCircle2, CircleDashed, OctagonAlert, TriangleAlert } from "lucide-react";
import type { CheckStatus, HealthCheck } from "@/lib/health/types";
import { cn } from "@/lib/cn";

export const statusStyles: Record<CheckStatus, { label: string; icon: typeof CheckCircle2; text: string; pill: string }> = {
  ok: { label: "OK", icon: CheckCircle2, text: "text-sage-deep", pill: "bg-sage-soft text-sage-deep" },
  warn: { label: "Warning", icon: TriangleAlert, text: "text-brown", pill: "bg-blush-soft text-brown" },
  fail: { label: "Error", icon: OctagonAlert, text: "text-danger", pill: "bg-danger/10 text-danger" },
  skip: { label: "Not run", icon: CircleDashed, text: "text-muted", pill: "bg-cream text-muted" },
};

export function StatusPill({ status, className }: { status: CheckStatus; className?: string }) {
  const style = statusStyles[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", style.pill, className)}>
      {style.label}
    </span>
  );
}

/** One health check: status, what was found, how to fix it and the items involved. */
export function HealthCheckRow({ check }: { check: HealthCheck }) {
  const style = statusStyles[check.status];
  const Icon = style.icon;
  return (
    <li className="flex gap-3 px-5 py-4">
      <Icon size={18} aria-hidden="true" className={cn("mt-0.5 shrink-0", style.text)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-charcoal">
            {check.label}
            <span className="sr-only"> — {style.label}</span>
          </p>
          {check.durationMs !== undefined && (
            <span className="text-xs tabular-nums text-muted">{check.durationMs} ms</span>
          )}
        </div>
        <p className="mt-0.5 break-words text-sm text-muted">{check.detail}</p>
        {check.fix && check.status !== "ok" && (
          <p className="mt-1 text-xs text-charcoal">
            <span className="font-medium">Fix: </span>
            {check.fix}
          </p>
        )}
        {check.items && check.items.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {check.items.map((item) => (
              <li key={item} className="rounded-md bg-cream px-2 py-0.5 text-xs text-charcoal">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
