"use server";

import type { AuthError } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { AUTH_PENDING_MESSAGE, isPreviewMode, PREVIEW_SESSION_COOKIE, requireAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient, isTeamManagementConfigured } from "@/lib/supabase/service";
import { safeAdminPath, validateNewPassword } from "@/lib/validation/password";

/**
 * Admin sign-in, sign-out and password management (Supabase Auth).
 * Messages never reveal whether an email belongs to an admin.
 */

const PREVIEW_MESSAGE = "This is the preview — sign-in works once the database (Supabase) is connected.";

function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "user_banned":
      return "This account has been suspended. Contact a supreme or developer admin.";
    case "email_not_confirmed":
      return "This account hasn't been confirmed yet. Ask the admin who added you.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "session_expired":
    case "session_not_found":
      return "Your session has expired. Please sign in again.";
    default:
      return error.status === 429 ? "Too many attempts. Please wait a few minutes and try again." : "Something went wrong. Please try again.";
  }
}

async function siteOrigin(): Promise<string> {
  if (siteConfig.url) return siteConfig.url.replace(/\/$/, "");
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------

export type SignInState = { status: "idle" } | { status: "error"; message: string; email: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  const password = String(formData.get("password") ?? "");
  const next = safeAdminPath(String(formData.get("next") ?? ""));
  if (!email || !password) return { status: "error", message: "Enter your email and password.", email };

  // Development preview (no database): any email and password opens the read-only preview.
  if (isPreviewMode) await startPreviewSession(next);
  if (!isSupabaseConfigured) return { status: "error", message: PREVIEW_MESSAGE, email };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", message: authErrorMessage(error), email };

  const auth = await requireAdmin();
  if (!auth.ok) {
    await supabase.auth.signOut();
    return { status: "error", message: "This account doesn't have administrator access.", email };
  }
  if (auth.admin.mustChangePassword) redirect("/admin/reset-password?first=1");
  redirect(next);
}

/** Development preview only: the one-click "Sign in to the preview" button. Does nothing elsewhere. */
export async function signInToPreview(formData: FormData): Promise<void> {
  if (!isPreviewMode) redirect("/admin/login");
  await startPreviewSession(safeAdminPath(String(formData.get("next") ?? "")));
}

async function startPreviewSession(next: string): Promise<never> {
  (await cookies()).set(PREVIEW_SESSION_COOKIE, "1", { path: "/admin", sameSite: "lax", httpOnly: true });
  redirect(next);
}

export async function signOut(): Promise<void> {
  if (isPreviewMode) (await cookies()).delete({ name: PREVIEW_SESSION_COOKIE, path: "/admin" });
  if (isSupabaseConfigured) {
    const supabase = await createSessionSupabaseClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login?signed_out=1");
}

// ---------------------------------------------------------------------------
// Forgotten password
// ---------------------------------------------------------------------------

export type ResetRequestState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; message: string; email: string };

/** Emails a password reset link. Always answers the same way, whether or not the email is an admin's. */
export async function requestPasswordReset(_prev: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { status: "error", message: "Enter a valid email address.", email };
  if (!isSupabaseConfigured) return { status: "error", message: PREVIEW_MESSAGE, email };

  const supabase = await createSessionSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/admin/auth/callback?next=/admin/reset-password`,
  });
  // Only rate limits are reported; anything else would reveal whether the account exists.
  if (error && (error.code === "over_email_send_rate_limit" || error.status === 429)) {
    return { status: "error", message: authErrorMessage(error), email };
  }
  return { status: "sent", email };
}

// ---------------------------------------------------------------------------
// Set / change password
// ---------------------------------------------------------------------------

export type PasswordState =
  | { status: "idle" }
  | { status: "error"; message?: string; errors: { current?: string; password?: string; confirm?: string } }
  | { status: "saved"; message: string };

/** After a reset link, or on first sign-in with a temporary password. */
export async function setNewPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const errors = validateNewPassword(password, String(formData.get("confirm") ?? ""));
  if (errors.password || errors.confirm) return { status: "error", errors };
  if (!isSupabaseConfigured) return { status: "error", message: PREVIEW_MESSAGE, errors: {} };

  const supabase = await createSessionSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Your reset link has expired. Please request a new one.", errors: {} };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: authErrorMessage(error), errors: {} };

  if (user.app_metadata?.must_change_password && isTeamManagementConfigured) {
    await createServiceSupabaseClient().auth.admin.updateUserById(user.id, {
      app_metadata: { must_change_password: false },
    });
  }
  redirect("/admin/dashboard?password=updated");
}

/** From the account page: needs the current password. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const errors: { current?: string; password?: string; confirm?: string } = {
    ...validateNewPassword(password, String(formData.get("confirm") ?? ""), { current }),
  };
  if (!current) errors.current = "Enter your current password.";
  if (Object.keys(errors).length > 0) return { status: "error", errors };

  const auth = await requireAdmin();
  if (!auth.ok) {
    return { status: "error", message: auth.reason === "auth_not_configured" ? AUTH_PENDING_MESSAGE : "Please sign in again.", errors: {} };
  }
  if (!auth.admin.email) return { status: "error", message: "Your account has no email address.", errors: {} };

  const supabase = await createSessionSupabaseClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: auth.admin.email, password: current });
  if (verifyError) {
    return verifyError.code === "invalid_credentials"
      ? { status: "error", errors: { current: "That isn't your current password." } }
      : { status: "error", message: authErrorMessage(verifyError), errors: {} };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", message: authErrorMessage(error), errors: {} };
  return { status: "saved", message: "Your password has been changed." };
}
