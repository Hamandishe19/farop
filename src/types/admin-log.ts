import type { AdminRole } from "../lib/auth/roles.ts";

/** Parts of the admin area a logged change belongs to (filterable on the Activity log page). */
export const ACTIVITY_AREAS = ["products", "finance", "team", "settings"] as const;

export type ActivityArea = (typeof ACTIVITY_AREAS)[number];

export const activityAreaLabels: Record<ActivityArea, string> = {
  products: "Products",
  finance: "Finances",
  team: "Team",
  settings: "Business settings",
};

/** One field that was changed: values are display text, null when blank (or not shown). */
export interface ActivityChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface ActivityEntry {
  id: number;
  createdAt: string;
  actorId: string;
  actorName: string;
  actorRole: AdminRole;
  area: ActivityArea;
  summary: string;
  changes: ActivityChange[];
}

/** An admin who appears in the log (for the "made by" filter). */
export interface ActivityActor {
  id: string;
  name: string;
  role: AdminRole;
}
