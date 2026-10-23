import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, GRANTABLE_PERMISSIONS, isAdminRole, isGrantablePermission, type AdminRole, type Permission } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";

export interface AdminSession {
  userId: string;
  email?: string;
  name?: string;
  role: AdminRole;
  /** Extra permissions granted to this admin individually (regular admins only). */
  grants: string[];
  /** True in the development preview (no database): nothing can be saved. */
  preview: boolean;
  /** Signed in with a temporary password that must be replaced before using the admin. */
  mustChangePassword: boolean;
}

export type AdminCheck =
  | { ok: true; admin: AdminSession }
  | { ok: false; reason: "auth_not_configured" | "unauthorised" | "forbidden" };

/** Development preview only: which role the preview is showing. */
export const PREVIEW_ROLE_COOKIE = "farop_admin_preview_role";

/** Preview-only role choice: a regular admin who has been granted finance access. */
export const PREVIEW_REGULAR_WITH_FINANCE = "regular-finance";

/** Development preview only: set by the sign-in form so the preview also starts at sign-in. */
export const PREVIEW_SESSION_COOKIE = "farop_admin_preview_session";

export const isPreviewMode = !isSupabaseConfigured && process.env.NODE_ENV !== "production";

/**
 * Server-side authorisation for every admin mutation.
 *
 * The signed-in Supabase user must have a row in `public.admin_users`; its
 * `role` decides what they may do (src/lib/auth/roles.ts). Row Level
 * Security enforces the same rules again in the database. Without Supabase
 * this always refuses, so the preview can never change anything.
 */
export async function requireAdmin(permission?: Permission | Permission[]): Promise<AdminCheck> {
  if (!isSupabaseConfigured) return { ok: false, reason: "auth_not_configured" };

  const supabase = await createSessionSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthorised" };

  const { data, error } = await supabase
    .from("admin_users")
    .select("role, name, permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data || !isAdminRole(data.role)) return { ok: false, reason: "unauthorised" };

  const admin: AdminSession = {
    userId: user.id,
    email: user.email,
    name: data.name ?? undefined,
    role: data.role,
    grants: Array.isArray(data.permissions) ? data.permissions.filter(isGrantablePermission) : [],
    preview: false,
    mustChangePassword: user.app_metadata?.must_change_password === true,
  };
  if (permission && !allows(admin, permission)) return { ok: false, reason: "forbidden" };
  // A temporary password must be replaced before the admin can change anything.
  if (permission && admin.mustChangePassword) return { ok: false, reason: "forbidden" };
  return { ok: true, admin };
}

/**
 * For admin pages: the signed-in admin, or a redirect to sign-in. Pages that
 * need a permission the admin lacks redirect to the dashboard. In the
 * development preview, returns a pretend admin with the previewed role.
 */
export async function requireAdminPage(permission?: Permission | Permission[]): Promise<AdminSession> {
  let admin: AdminSession;
  if (!isSupabaseConfigured) {
    // Production without a database never reaches here (the proxy sends it to the login page).
    if (!isPreviewMode) redirect("/admin/login");
    const cookieStore = await cookies();
    if (!cookieStore.get(PREVIEW_SESSION_COOKIE)) redirect("/admin/login");
    const stored = cookieStore.get(PREVIEW_ROLE_COOKIE)?.value;
    const withFinance = stored === PREVIEW_REGULAR_WITH_FINANCE;
    admin = {
      userId: "preview",
      name: "Preview",
      role: withFinance ? "regular" : isAdminRole(stored) ? stored : "developer",
      grants: withFinance ? [...GRANTABLE_PERMISSIONS] : [],
      preview: true,
      mustChangePassword: false,
    };
  } else {
    const check = await requireAdmin();
    if (!check.ok) redirect("/admin/login");
    admin = check.admin;
    if (admin.mustChangePassword) redirect("/admin/reset-password?first=1");
  }
  if (permission && !allows(admin, permission)) redirect("/admin/dashboard");
  return admin;
}

/** True when the admin has the permission (or, for a list, any one of them). */
export function allows(admin: Pick<AdminSession, "role" | "grants">, permission: Permission | Permission[]): boolean {
  const options = Array.isArray(permission) ? permission : [permission];
  return options.some((option) => can(admin.role, option, admin.grants));
}

export function refusalMessage(reason: "auth_not_configured" | "unauthorised" | "forbidden"): string {
  if (reason === "auth_not_configured") return AUTH_PENDING_MESSAGE;
  if (reason === "forbidden") return "Your admin role doesn't allow this.";
  return "You are not signed in as an administrator. Please sign in again.";
}

export const AUTH_PENDING_MESSAGE =
  "Not saved — this is a preview. Changes can be saved once the database (Supabase) is connected.";
