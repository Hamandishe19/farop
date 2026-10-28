import "server-only";

import type { AdminSession } from "@/lib/auth/admin";
import { canSeeAdmin, canUseFinance, isAdminRole, type AdminRole } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import {
  ACTIVITY_AREAS,
  type ActivityActor,
  type ActivityArea,
  type ActivityChange,
  type ActivityEntry,
} from "@/types/admin-log";

/**
 * The admin Activity log (`public.admin_activity`, supabase/schema.sql): who
 * changed what in the admin area. The database fills in who made each change
 * from the signed-in session and doesn't allow entries to be edited or
 * deleted. Its security rules hide the developer's entries from other admins,
 * and finance entries from admins without finance access.
 */

export const ACTIVITY_PAGE_SIZE = 50;

/** Shown when the database was set up before the Activity log existed. */
export const ACTIVITY_SETUP_MESSAGE =
  "The activity log isn't set up in the database yet. Run supabase/schema.sql again in the Supabase SQL Editor (it's safe to re-run), then reload this page.";

/** True when the error means `admin_activity` (or its function) hasn't been created yet. */
function isMissingSetup(error: { code?: string }): boolean {
  // PGRST205: unknown table, PGRST202: unknown function, 42P01: undefined table.
  return error.code === "PGRST205" || error.code === "PGRST202" || error.code === "42P01";
}

let warnedMissingSetup = false;

/**
 * Records a change made by `admin`. Call it after the change has been saved.
 * Best effort: a failure to log never undoes or blocks the change itself.
 */
export async function logAdminActivity(
  admin: AdminSession,
  entry: { area: ActivityArea; summary: string; changes?: ActivityChange[] },
): Promise<void> {
  if (admin.preview || !isSupabaseConfigured) return;
  try {
    const supabase = await createSessionSupabaseClient();
    // actor_id, actor_name and actor_role are set by the database from the session.
    const { error } = await supabase
      .from("admin_activity")
      .insert({ area: entry.area, summary: entry.summary, changes: entry.changes ?? [] });
    if (error && isMissingSetup(error)) {
      if (!warnedMissingSetup) console.warn(`Activity log skipped: ${ACTIVITY_SETUP_MESSAGE}`);
      warnedMissingSetup = true;
    } else if (error) {
      console.error(`Activity log entry not saved: ${error.message}`);
    }
  } catch (error) {
    console.error("Activity log entry not saved:", error);
  }
}

export interface ActivityFilters {
  actorId?: string;
  area?: ActivityArea;
  /** 1-based page number. */
  page: number;
}

/** One page of the log, newest first, with only what `viewer` may see. */
export async function listAdminActivity(
  viewer: Pick<AdminSession, "role" | "grants">,
  filters: ActivityFilters,
): Promise<{ entries: ActivityEntry[]; total: number; setupNeeded: boolean }> {
  const from = (filters.page - 1) * ACTIVITY_PAGE_SIZE;
  if (!isSupabaseConfigured) {
    const matching = previewEntries(viewer).filter(
      (entry) => (!filters.actorId || entry.actorId === filters.actorId) && (!filters.area || entry.area === filters.area),
    );
    return { entries: matching.slice(from, from + ACTIVITY_PAGE_SIZE), total: matching.length, setupNeeded: false };
  }

  const supabase = await createSessionSupabaseClient();
  let query = supabase
    .from("admin_activity")
    .select("id, created_at, actor_id, actor_name, actor_role, area, summary, changes", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, from + ACTIVITY_PAGE_SIZE - 1);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.area) query = query.eq("area", filters.area);
  const { data, error, count } = await query;
  if (error && isMissingSetup(error)) return { entries: [], total: 0, setupNeeded: true };
  if (error) throw new Error(`Could not load the activity log: ${error.message}`);

  const entries = (data ?? [])
    .filter((row) => isAdminRole(row.actor_role) && ACTIVITY_AREAS.includes(row.area as ActivityArea))
    .map((row) => ({
      id: Number(row.id),
      createdAt: row.created_at as string,
      actorId: row.actor_id as string,
      actorName: (row.actor_name as string | null) ?? "Unknown admin",
      actorRole: row.actor_role as AdminRole,
      area: row.area as ActivityArea,
      summary: row.summary as string,
      changes: Array.isArray(row.changes) ? (row.changes as ActivityChange[]) : [],
    }));
  return { entries, total: count ?? entries.length, setupNeeded: false };
}

/** Every admin with at least one entry `viewer` may see (including removed admins), by name. */
export async function listActivityActors(viewer: Pick<AdminSession, "role" | "grants">): Promise<ActivityActor[]> {
  let actors: ActivityActor[];
  if (!isSupabaseConfigured) {
    const byId = new Map(previewEntries(viewer).map((entry) => [entry.actorId, entry]));
    actors = [...byId.values()].map((entry) => ({ id: entry.actorId, name: entry.actorName, role: entry.actorRole }));
  } else {
    const supabase = await createSessionSupabaseClient();
    const { data, error } = await supabase.rpc("admin_activity_actors");
    if (error && isMissingSetup(error)) return [];
    if (error) throw new Error(`Could not load the activity log: ${error.message}`);
    actors = ((data ?? []) as Array<{ actor_id: string; actor_name: string | null; actor_role: string }>)
      .filter((row) => isAdminRole(row.actor_role))
      .map((row) => ({ id: row.actor_id, name: row.actor_name ?? "Unknown admin", role: row.actor_role as AdminRole }));
  }
  return actors.sort((a, b) => a.name.localeCompare(b.name));
}

/** Shown in the development preview only, so the page can be tried out. */
function previewEntries(viewer: Pick<AdminSession, "role" | "grants">): ActivityEntry[] {
  const developer = { actorId: "preview-developer", actorName: "Developer (you)", actorRole: "developer" as const };
  const owner = { actorId: "preview-supreme", actorName: "Shop owner", actorRole: "supreme" as const };
  const assistant = { actorId: "preview-regular", actorName: "Shop assistant", actorRole: "regular" as const };
  const entries: ActivityEntry[] = [
    {
      id: 6,
      createdAt: "2026-10-27T09:42:00Z",
      ...assistant,
      area: "products",
      summary: "Edited product “Floral summer dress”",
      changes: [
        { field: "Price", from: "18", to: "15" },
        { field: "Sizes", from: "2, 3, 4", to: "3, 4" },
      ],
    },
    {
      id: 5,
      createdAt: "2026-10-26T15:10:00Z",
      ...owner,
      area: "finance",
      summary: "Recorded a sale of US$32.00 to Rudo (2 items) — paid",
      changes: [],
    },
    { id: 4, createdAt: "2026-10-26T08:05:00Z", ...assistant, area: "products", summary: "Hid “Denim jacket” from the website", changes: [] },
    {
      id: 3,
      createdAt: "2026-10-25T17:30:00Z",
      ...owner,
      area: "team",
      summary: "Changed the access of Shop assistant",
      changes: [{ field: "Extra access", from: null, to: "View finances" }],
    },
    {
      id: 2,
      createdAt: "2026-10-24T11:00:00Z",
      ...owner,
      area: "settings",
      summary: "Edited the business settings",
      changes: [{ field: "EcoCash fee", from: "0", to: "0.5" }],
    },
    { id: 1, createdAt: "2026-10-20T07:45:00Z", ...developer, area: "team", summary: "Added Shop owner as a supreme admin", changes: [] },
  ];
  return entries.filter(
    (entry) => canSeeAdmin(viewer.role, entry.actorRole) && (entry.area !== "finance" || canUseFinance(viewer.role, viewer.grants)),
  );
}
