import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminCard, AdminPageFallback, AdminPageHeader } from "@/components/admin/admin-page-header";
import { RoleBadge } from "@/components/admin/role-badge";
import { buttonClass } from "@/components/ui/button-styles";
import { requireAdminPage } from "@/lib/auth/admin";
import { canUseFinance } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { ACTIVITY_PAGE_SIZE, ACTIVITY_SETUP_MESSAGE, listActivityActors, listAdminActivity } from "@/services/admin-log";
import { ACTIVITY_AREAS, activityAreaLabels, type ActivityArea, type ActivityEntry } from "@/types/admin-log";

export const metadata: Metadata = { title: "Activity log" };

const areaStyles: Record<ActivityArea, string> = {
  products: "bg-cream text-charcoal",
  finance: "bg-sage-soft text-sage-deep",
  team: "bg-blush-soft text-brown",
  settings: "bg-white text-muted ring-1 ring-line",
};

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Harare",
  }).format(new Date(iso));

/**
 * Every admin can see who changed what. Reads the page address (filters), so
 * it renders inside a loading boundary as Cache Components requires.
 */
export default function ActivityPage(props: PageProps<"/admin/activity">) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <ActivityPageContent {...props} />
    </Suspense>
  );
}

async function ActivityPageContent({ searchParams }: PageProps<"/admin/activity">) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

  const areas = ACTIVITY_AREAS.filter((area) => area !== "finance" || canUseFinance(admin.role, admin.grants));
  const area = areas.find((value) => value === one(params.area));
  const requestedActor = one(params.admin);
  const actorId = requestedActor && /^[\w-]{1,64}$/.test(requestedActor) ? requestedActor : undefined;
  const page = Math.max(1, Math.floor(Number(one(params.page)) || 1));

  const [{ entries, total, setupNeeded }, actors] = await Promise.all([
    listAdminActivity(admin, { actorId, area, page }),
    listActivityActors(admin),
  ]);
  // You're always in the "made by" list, even before your first change.
  const you = admin.preview ? `preview-${admin.role}` : admin.userId;
  if (!actors.some((actor) => actor.id === you)) {
    actors.unshift({ id: you, name: admin.name ?? admin.email ?? "You", role: admin.role });
  }
  const selectedActor = actors.find((actor) => actor.id === actorId);

  const link = (changes: { admin?: string; area?: string; page?: number }) => {
    const next = { admin: actorId, area, page: undefined as number | undefined, ...changes };
    const query = new URLSearchParams();
    if (next.admin) query.set("admin", next.admin);
    if (next.area) query.set("area", next.area);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/admin/activity${query.size ? `?${query}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const field = "rounded-lg border border-line bg-white px-3 py-2 text-sm";

  return (
    <>
      <AdminPageHeader title="Activity log" description="Every change made in the admin area, who made it and when — newest first." />

      {admin.preview && (
        <p className="mb-5 rounded-lg bg-cream px-4 py-3 text-sm text-muted">
          These are example entries for the preview. Real changes appear here once the database is connected.
        </p>
      )}

      {setupNeeded && (
        <p role="alert" className="mb-5 rounded-lg bg-blush-soft px-4 py-3 text-sm text-charcoal">
          {ACTIVITY_SETUP_MESSAGE}
        </p>
      )}

      <div className="space-y-6">
        <form action="/admin/activity" className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-muted">
            Made by
            <select name="admin" defaultValue={selectedActor?.id ?? ""} className={field}>
              <option value="">All admins</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                  {actor.id === you ? " (you)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted">
            Area
            <select name="area" defaultValue={area ?? ""} className={field}>
              <option value="">Everything</option>
              {areas.map((value) => (
                <option key={value} value={value}>
                  {activityAreaLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass({ size: "sm" })}>
            Filter
          </button>
          {(actorId || area) && (
            <Link href="/admin/activity" className="py-2 text-sm text-muted underline-offset-4 hover:text-charcoal hover:underline">
              Clear filters
            </Link>
          )}
          {actorId !== you && (
            <Link
              href={link({ admin: you })}
              className="ml-auto py-2 text-sm text-muted underline-offset-4 hover:text-charcoal hover:underline"
            >
              Show only my changes
            </Link>
          )}
        </form>

        <AdminCard className="p-0">
          {entries.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">
              {actorId || area ? "No changes match these filters." : "No changes have been logged yet."}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} you={you} filterLink={link({ admin: entry.actorId })} />
              ))}
            </ul>
          )}
        </AdminCard>

        {total > 0 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm text-muted">
            <p>
              {(page - 1) * ACTIVITY_PAGE_SIZE + 1}–{Math.min(page * ACTIVITY_PAGE_SIZE, total)} of {total}
              {selectedActor && ` by ${selectedActor.name}`}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={link({ page: page - 1 })} className={buttonClass({ variant: "secondary", size: "sm" })}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  Newer
                </Link>
              )}
              {page < pages && (
                <Link href={link({ page: page + 1 })} className={buttonClass({ variant: "secondary", size: "sm" })}>
                  Older
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </>
  );
}

function ActivityRow({ entry, you, filterLink }: { entry: ActivityEntry; you: string; filterLink: string }) {
  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <p className="text-sm font-medium text-charcoal">{entry.summary}</p>
        <span className={cn("w-fit shrink-0 rounded-full px-2 py-0.5 text-xs", areaStyles[entry.area])}>
          {activityAreaLabels[entry.area]}
        </span>
      </div>
      {entry.changes.length > 0 && (
        <dl className="mt-2 space-y-1 text-xs">
          {entry.changes.map((change, index) => (
            <div key={index} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <dt className="text-muted">{change.field}:</dt>
              <dd className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-charcoal">
                {change.from === null && change.to === null ? (
                  <span>changed</span>
                ) : (
                  <>
                    <span className="break-words text-muted line-through decoration-muted/50">{change.from ?? "(blank)"}</span>
                    <ArrowRight size={11} aria-label="changed to" className="shrink-0 self-center text-muted" />
                    <span className="break-words">{change.to ?? "(blank)"}</span>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <Link href={filterLink} className="font-medium text-charcoal underline-offset-4 hover:underline" title="Show only this admin's changes">
          {entry.actorName}
          {entry.actorId === you && " (you)"}
        </Link>
        <RoleBadge role={entry.actorRole} className="px-2 py-0 text-[11px]" />
        <span aria-hidden="true">·</span>
        <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
      </p>
    </li>
  );
}
