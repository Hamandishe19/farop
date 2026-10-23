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
 *   Reset others' passwords ✗       ✗        ✓
 *   Finance: analytics    grant      ✓        ✓
 *   Finance: record        grant      ✓        ✓
 *
 * "grant" = only when a supreme or developer admin has ticked that permission
 * for the regular admin on the Team page (stored in admin_users.permissions).
 *
 * There is exactly one developer admin. It's created directly in the database,
 * can't be changed or removed from the admin area, and is hidden from every
 * other admin. Nobody can change or remove their own account.
 */

export const ADMIN_ROLES = ["regular", "supreme", "developer"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const roleLabels: Record<AdminRole, string> = {
  regular: "Regular admin",
  supreme: "Supreme admin",
  developer: "Developer admin",
};

export const roleDescriptions: Record<AdminRole, string> = {
  regular: "Adds and edits products, prices and photos, and hides or shows them. Finance access only if granted.",
  supreme: "Everything a regular admin can do, plus business finances, deleting products, editing business settings and managing regular admins.",
  developer: "Full access, including supreme admins and technical settings.",
};

export type Permission =
  | "products.edit"
  | "products.delete"
  | "settings.view"
  | "settings.edit"
  | "team.view"
  | "team.passwords"
  | "system.view"
  | "finance.view"
  | "finance.edit";

/** Permissions a supreme or developer admin can grant to an individual regular admin. */
export const GRANTABLE_PERMISSIONS = ["finance.view", "finance.edit"] as const;

export type GrantablePermission = (typeof GRANTABLE_PERMISSIONS)[number];

export const grantLabels: Record<GrantablePermission, { label: string; description: string }> = {
  "finance.view": { label: "View finances", description: "Business analytics: revenue, costs, profit, sales and expenses." },
  "finance.edit": { label: "Record sales & expenses", description: "Add and edit sales, expenses and product cost prices." },
};

const permissions: Record<AdminRole, readonly Permission[]> = {
  regular: ["products.edit", "settings.view"],
  supreme: ["products.edit", "products.delete", "settings.view", "settings.edit", "team.view", "finance.view", "finance.edit"],
  developer: [
    "products.edit",
    "products.delete",
    "settings.view",
    "settings.edit",
    "team.view",
    "team.passwords",
    "system.view",
    "finance.view",
    "finance.edit",
  ],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function isGrantablePermission(value: unknown): value is GrantablePermission {
  return typeof value === "string" && (GRANTABLE_PERMISSIONS as readonly string[]).includes(value);
}

/** Whether a role (plus any permissions granted to this admin individually) allows `permission`. */
export function can(role: AdminRole, permission: Permission, grants: readonly string[] = []): boolean {
  if (permissions[role].includes(permission)) return true;
  return role === "regular" && isGrantablePermission(permission) && grants.includes(permission);
}

/** Can open the finance pages at all (see the numbers, or record sales and expenses). */
export function canUseFinance(role: AdminRole, grants: readonly string[] = []): boolean {
  return can(role, "finance.view", grants) || can(role, "finance.edit", grants);
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

/** Whether `viewer` may see that another admin with `targetRole` exists (the developer is visible only to itself). */
export function canSeeAdmin(viewer: AdminRole, targetRole: AdminRole): boolean {
  return targetRole !== "developer" || viewer === "developer";
}
