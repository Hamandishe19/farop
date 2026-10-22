import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-page-header";
import { HealthCheckRow, StatusPill, statusStyles } from "@/components/admin/health-check-row";
import { PageChecks, RefreshDataButton, RerunChecksButton } from "@/components/admin/system-tools";
import { requireAdminPage } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";
import { countByStatus, overallStatus } from "@/lib/health/types";
import { supabaseUrl } from "@/lib/supabase/config";
import { getRuntimeInfo, runHealthChecks } from "@/services/health";

export const metadata: Metadata = { title: "System health" };

const summaries = {
  ok: "Everything checked is working.",
  warn: "The site is working, but some things need attention.",
  fail: "Something is broken and needs fixing.",
  skip: "Nothing could be checked yet.",
} as const;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** Supabase dashboard link for the connected project (https://<ref>.supabase.co). */
function supabaseDashboardUrl(): string | undefined {
  const ref = supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  return ref ? `https://supabase.com/dashboard/project/${ref}` : undefined;
}

export default async function AdminSystemPage() {
  await requireAdminPage("system.view");

  return (
    <>
      <AdminPageHeader
        title="System health"
        description="Developer view: is the website, database and catalogue working as it should?"
        action={<RerunChecksButton />}
      />
      <Suspense fallback={<ChecksFallback />}>
        <HealthReport />
      </Suspense>
    </>
  );
}

async function HealthReport() {
  // Health is measured live on every visit, never prerendered.
  await connection();
  const [sections, runtime] = await Promise.all([runHealthChecks(), Promise.resolve(getRuntimeInfo())]);
  const all = sections.flatMap((section) => section.checks);
  const status = overallStatus(all);
  const counts = countByStatus(all);
  const StatusIcon = statusStyles[status].icon;
  const dashboard = supabaseDashboardUrl();

  const runtimeRows: Array<[string, string | undefined]> = [
    ["Environment", runtime.environment],
    ["Next.js", runtime.nextVersion],
    ["Node.js", runtime.nodeVersion],
    ["Platform", runtime.platform],
    ["Region", runtime.region],
    ["Deployed commit", runtime.commit],
    ["Server uptime", formatUptime(runtime.uptimeSeconds)],
    ["Server memory", `${runtime.memoryMb} MB`],
  ];

  return (
    <div className="space-y-6">
      <AdminCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <StatusIcon size={28} aria-hidden="true" className={cn("shrink-0", statusStyles[status].text)} />
          <div>
            <p className="font-display text-2xl text-charcoal">{summaries[status]}</p>
            <p className="mt-1 text-sm text-muted">
              {counts.ok} OK · {counts.warn} warnings · {counts.fail} errors · {counts.skip} not run · checked{" "}
              {new Date(runtime.serverTime).toLocaleTimeString("en-GB", { timeZone: "Africa/Harare" })} (Harare time)
            </p>
          </div>
        </div>
        <StatusPill status={status} className="self-start sm:self-center" />
      </AdminCard>

      {sections.map((section) => {
        const sectionStatus = overallStatus(section.checks);
        return (
          <section key={section.id} aria-labelledby={`health-${section.id}`}>
            <AdminCard className="p-0">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <h2 id={`health-${section.id}`} className="text-sm font-medium">
                    {section.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">{section.description}</p>
                </div>
                <StatusPill status={sectionStatus} />
              </div>
              <ul className="divide-y divide-line">
                {section.checks.map((check) => (
                  <HealthCheckRow key={check.id} check={check} />
                ))}
              </ul>
            </AdminCard>
          </section>
        );
      })}

      <section aria-labelledby="health-tools">
        <AdminCard className="p-0">
          <div className="border-b border-line px-5 py-4">
            <h2 id="health-tools" className="text-sm font-medium">Developer tools</h2>
            <p className="mt-0.5 text-xs text-muted">On-demand checks and maintenance.</p>
          </div>
          <div className="divide-y divide-line">
            <PageChecks />
            <RefreshDataButton />
            {dashboard && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <h3 className="text-sm font-medium">Supabase dashboard</h3>
                  <p className="mt-0.5 text-xs text-muted">Database tables, sign-in users, storage, logs and usage limits.</p>
                </div>
                <a href={dashboard} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-charcoal hover:underline">
                  Open <ExternalLink size={13} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </AdminCard>
      </section>

      <section aria-labelledby="health-runtime">
        <AdminCard>
          <h2 id="health-runtime" className="text-sm font-medium">Server</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {runtimeRows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 break-words text-charcoal">{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </AdminCard>
      </section>
    </div>
  );
}

function ChecksFallback() {
  return (
    <div aria-busy="true" aria-label="Running health checks" className="space-y-6">
      <div className="h-24 animate-pulse rounded-xl bg-white/60" />
      <div className="h-64 animate-pulse rounded-xl bg-white/60" />
      <div className="h-64 animate-pulse rounded-xl bg-white/60" />
    </div>
  );
}
