import type { ReactNode } from "react";

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-charcoal">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  // Default padding unless the caller sets its own (e.g. p-0 for edge-to-edge tables).
  const padding = /(^|\s)p-\d/.test(className) ? "" : "p-5";
  return <div className={`rounded-xl border border-line bg-white shadow-[var(--shadow-soft)] ${padding} ${className}`}>{children}</div>;
}

export function formatAdminDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );
}

/** Placeholder while an admin page reads its address (filters, ids) and loads its data. */
export function AdminPageFallback() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-white/60" />
      <div className="h-[60vh] animate-pulse rounded-xl bg-white/60" />
    </div>
  );
}
