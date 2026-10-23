"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { isPreviewMode, PREVIEW_REGULAR_WITH_FINANCE, PREVIEW_ROLE_COOKIE, refusalMessage, requireAdmin } from "@/lib/auth/admin";
import { canManage, isAdminRole, isGrantablePermission, roleLabels, type AdminRole } from "@/lib/auth/roles";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient, isTeamManagementConfigured } from "@/lib/supabase/service";
import {
  readSettingsForm,
  validateSettings,
  type SettingsFormErrors,
  type SettingsFormValues,
} from "@/lib/validation/settings";
import { passwordProblems } from "@/lib/validation/password";
import { SETTINGS_TAG } from "@/services/settings";

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

const TEAM_SETUP_MESSAGE =
  "Adding and removing admins needs the server key SUPABASE_SERVICE_ROLE_KEY. See supabase/README.md.";

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

export interface AddAdminValues {
  name: string;
  email: string;
  role: string;
}

export type AddAdminState =
  | { status: "idle" }
  | { status: "error"; message: string; errors: Partial<Record<keyof AddAdminValues | "password", string>>; values: AddAdminValues }
  | { status: "added"; message: string };

/** Creates a sign-in account for a new admin with a temporary password, and gives them a role. */
export async function addAdmin(_prev: AddAdminState, formData: FormData): Promise<AddAdminState> {
  const values: AddAdminValues = {
    name: String(formData.get("name") ?? "").trim().slice(0, 80),
    email: String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200),
    role: String(formData.get("role") ?? ""),
  };
  const password = String(formData.get("password") ?? "");

  const errors: Partial<Record<keyof AddAdminValues | "password", string>> = {};
  if (values.name.length < 2) errors.name = "Enter their name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!isAdminRole(values.role)) errors.role = "Choose a role.";
  if (password.length < 10) errors.password = "Use at least 10 characters.";
  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Please correct the highlighted fields.", errors, values };
  }
  const role = values.role as AdminRole;

  const auth = await requireAdmin("team.view");
  if (!auth.ok) return { status: "error", message: refusalMessage(auth.reason), errors: {}, values };
  if (!canManage(auth.admin.role, role)) {
    return { status: "error", message: `Your role can't add a ${roleLabels[role].toLowerCase()}.`, errors: {}, values };
  }
  if (!isTeamManagementConfigured) return { status: "error", message: TEAM_SETUP_MESSAGE, errors: {}, values };

  const service = createServiceSupabaseClient();
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: values.email,
    password,
    email_confirm: true,
    user_metadata: { name: values.name },
    // Server-controlled: the admin is sent to "Set a new password" on first sign-in.
    app_metadata: { must_change_password: true },
  });
  if (createError || !created.user) {
    const exists = createError?.message.toLowerCase().includes("already");
    return {
      status: "error",
      message: exists ? "An account with this email already exists." : `Not added: ${createError?.message ?? "unknown error"}`,
      errors: exists ? { email: "Already has an account." } : {},
      values,
    };
  }

  const { error: insertError } = await service
    .from("admin_users")
    .insert({ user_id: created.user.id, name: values.name, email: values.email, role });
  if (insertError) {
    await service.auth.admin.deleteUser(created.user.id);
    return { status: "error", message: `Not added: ${insertError.message}`, errors: {}, values };
  }

  revalidatePath("/admin/team");
  return {
    status: "added",
    message: `${values.name} was added as a ${roleLabels[role].toLowerCase()}. Share the temporary password with them privately — they'll choose their own when they first sign in.`,
  };
}

/** Loads the admin being changed and checks the actor may manage them. */
async function manageable(userId: string) {
  const auth = await requireAdmin("team.view");
  if (!auth.ok) return { error: refusalMessage(auth.reason) } as const;
  if (userId === auth.admin.userId) return { error: "You can't change or remove your own account." } as const;
  if (!isTeamManagementConfigured) return { error: TEAM_SETUP_MESSAGE } as const;

  const service = createServiceSupabaseClient();
  const { data: target } = await service.from("admin_users").select("role, name").eq("user_id", userId).maybeSingle();
  if (!target || !isAdminRole(target.role)) return { error: "That admin no longer exists." } as const;
  if (!canManage(auth.admin.role, target.role)) {
    return { error: `Your role can't change a ${roleLabels[target.role].toLowerCase()}.` } as const;
  }
  return { actor: auth.admin, target: { role: target.role as AdminRole, name: target.name as string | null }, service } as const;
}

export async function changeAdminRole(userId: string, newRole: string): Promise<ActionResult> {
  if (!isAdminRole(newRole)) return { ok: false, message: "Choose a valid role." };
  const result = await manageable(userId);
  if ("error" in result) return { ok: false, message: result.error ?? "Not allowed." };
  if (!canManage(result.actor.role, newRole)) {
    return { ok: false, message: `Your role can't make someone a ${roleLabels[newRole].toLowerCase()}.` };
  }

  const { error } = await result.service.from("admin_users").update({ role: newRole, permissions: [] }).eq("user_id", userId);
  if (error) return { ok: false, message: `Not changed: ${error.message}` };
  revalidatePath("/admin/team");
  return { ok: true, message: `${result.target.name ?? "They"} is now a ${roleLabels[newRole].toLowerCase()}.` };
}

/** Sets the extra permissions (finance access) of a regular admin. */
export async function setAdminGrants(userId: string, grants: string[]): Promise<ActionResult> {
  const result = await manageable(userId);
  if ("error" in result) return { ok: false, message: result.error ?? "Not allowed." };
  if (result.target.role !== "regular") {
    return { ok: false, message: "Supreme and developer admins already have finance access." };
  }
  const permissions = [...new Set(grants.filter(isGrantablePermission))];
  const { error } = await result.service.from("admin_users").update({ permissions }).eq("user_id", userId);
  if (error) return { ok: false, message: `Not changed: ${error.message}` };
  revalidatePath("/admin/team");
  return { ok: true, message: "Access updated." };
}

/**
 * Developer admins only: gives another admin a new temporary password when
 * they've forgotten theirs. Passwords are stored scrambled (hashed), so nobody
 * can see the old one; the admin must choose their own at next sign-in.
 */
export async function resetAdminPassword(userId: string, password: string): Promise<ActionResult> {
  const problems = passwordProblems(password);
  if (problems.length > 0) return { ok: false, message: `The temporary password needs: ${problems.join(", ").toLowerCase()}.` };

  const auth = await requireAdmin("team.passwords");
  if (!auth.ok) return { ok: false, message: refusalMessage(auth.reason) };
  if (userId === auth.admin.userId) return { ok: false, message: "Change your own password on the My account page." };
  if (!isTeamManagementConfigured) return { ok: false, message: TEAM_SETUP_MESSAGE };

  const service = createServiceSupabaseClient();
  const { data: target } = await service.from("admin_users").select("name").eq("user_id", userId).maybeSingle();
  if (!target) return { ok: false, message: "That admin no longer exists." };

  const { error } = await service.auth.admin.updateUserById(userId, {
    password,
    app_metadata: { must_change_password: true },
  });
  if (error) return { ok: false, message: `Not changed: ${error.message}` };
  return {
    ok: true,
    message: `New temporary password set for ${target.name ?? "this admin"}. Share it with them privately — they'll choose their own when they sign in.`,
  };
}

/** Removes the admin's sign-in account entirely (their admin_users row goes with it). */
export async function removeAdmin(userId: string): Promise<ActionResult> {
  const result = await manageable(userId);
  if ("error" in result) return { ok: false, message: result.error ?? "Not allowed." };

  const { error } = await result.service.auth.admin.deleteUser(userId);
  if (error) return { ok: false, message: `Not removed: ${error.message}` };
  revalidatePath("/admin/team");
  return { ok: true, message: `${result.target.name ?? "The admin"} was removed.` };
}

// ---------------------------------------------------------------------------
// Business settings
// ---------------------------------------------------------------------------

export type SettingsFormState =
  | { status: "idle" }
  | { status: "invalid"; errors: SettingsFormErrors; values: SettingsFormValues }
  | { status: "refused"; message: string; values: SettingsFormValues }
  | { status: "saved"; message: string; values: SettingsFormValues };

export async function saveSettings(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const values = readSettingsForm(formData);
  const { errors, settings } = validateSettings(values);
  if (!settings) return { status: "invalid", errors, values };

  const auth = await requireAdmin("settings.edit");
  if (!auth.ok) return { status: "refused", message: refusalMessage(auth.reason), values };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, data: settings, updated_by: auth.admin.userId });
  if (error) return { status: "refused", message: `Not saved: ${error.message}`, values };

  updateTag(SETTINGS_TAG);
  return { status: "saved", message: "Saved. The website now shows these details.", values };
}

// ---------------------------------------------------------------------------
// Development preview
// ---------------------------------------------------------------------------

/** Switches which role the development preview shows. Does nothing outside the preview. */
export async function setPreviewRole(role: string): Promise<void> {
  if (!isPreviewMode || !(isAdminRole(role) || role === PREVIEW_REGULAR_WITH_FINANCE)) return;
  (await cookies()).set(PREVIEW_ROLE_COOKIE, role, { path: "/admin", sameSite: "lax", httpOnly: true });
}
