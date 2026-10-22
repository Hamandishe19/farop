/**
 * Admin roles and what each may do. Checked on the server for every admin
 * page and action, and mirrored in the database security rules
 * (supabase/schema.sql).
 *
 *                       Regular  Supreme  Developer
 *   View dashboard         ✓        ✓        ✓
 *   Add / edit products    ✓        ✓        ✓
 *   Hide / show products   ✓        ✓        ✓
 *   Delete products        ✗        ✓        ✓
 *   Business settings     view     edit     edit
 *   Manage regular admins  ✗        ✓        ✓
 *   Manage supreme admins  ✗        ✗        ✓
 *   System / technical     ✗        ✗        ✓
 *
 * Developer admins are created directly in the database and can't be changed
 * or removed from the admin area. Nobody can change or remove their own account.
 */

export const ADMIN_ROLES = ["regular", "supreme", "developer"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const roleLabels: Record<AdminRole, string> = {
  regular: "Regular admin",
  supreme: "Supreme admin",
  developer: "Developer admin",
};

export const roleDescriptions: Record<AdminRole, string> = {
  regular: "Adds and edits products, prices and photos, and hides or shows them.",
  supreme: "Everything a regular admin can do, plus deleting products, editing business settings and managing regular admins.",
  developer: "Full access, including supreme admins and technical settings.",
};

export type Permission =
  | "products.edit"
  | "products.delete"
  | "settings.view"
  | "settings.edit"
  | "team.view"
  | "system.view";

const permissions: Record<AdminRole, readonly Permission[]> = {
  regular: ["products.edit", "settings.view"],
  supreme: ["products.edit", "products.delete", "settings.view", "settings.edit", "team.view"],
  developer: ["products.edit", "products.delete", "settings.view", "settings.edit", "team.view", "system.view"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function can(role: AdminRole, permission: Permission): boolean {
  return permissions[role].includes(permission);
}

/** Roles this admin may give to someone, or take away from someone. */
export function assignableRoles(actor: AdminRole): AdminRole[] {
  if (actor === "developer") return ["regular", "supreme"];
  if (actor === "supreme") return ["regular"];
  return [];
}

/** Whether `actor` may change or remove the account of another admin who has `targetRole`. */
export function canManage(actor: AdminRole, targetRole: AdminRole): boolean {
  return assignableRoles(actor).includes(targetRole);
}
