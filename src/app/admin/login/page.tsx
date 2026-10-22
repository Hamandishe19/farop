import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LogIn } from "lucide-react";
import { signInToPreview } from "@/app/actions/auth";
import { AuthNotice, AuthShell } from "@/components/admin/auth-shell";
import { SignInForm } from "@/components/admin/sign-in-form";
import { buttonClass } from "@/components/ui/button-styles";
import { isPreviewMode, PREVIEW_SESSION_COOKIE, requireAdmin } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeAdminPath } from "@/lib/validation/password";

export const metadata: Metadata = { title: "Sign in" };

/** Administrator sign-in (Supabase email + password). Only users in admin_users get in. */
export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <AuthShell title="Welcome back" description="Sign in to manage the shop.">
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white/60" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const params = await searchParams;
  const first = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const next = first("next") ? safeAdminPath(first("next")) : undefined;

  if (isPreviewMode) {
    if ((await cookies()).has(PREVIEW_SESSION_COOKIE)) redirect(next ?? "/admin/dashboard");
    return (
      <>
        {first("signed_out") && <AuthNotice tone="success">You&apos;ve been signed out.</AuthNotice>}
        <AuthNotice tone="info">
          <strong className="font-medium">Development preview.</strong> The database isn&apos;t connected yet, so sign in
          with the button below to open a read-only preview of the admin area.
        </AuthNotice>
        <form action={signInToPreview}>
          {next && <input type="hidden" name="next" value={next} />}
          <button type="submit" className={buttonClass({ block: true, size: "lg" })}>
            <LogIn size={17} aria-hidden="true" />
            Sign in to the preview
          </button>
        </form>
      </>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthNotice tone="info">
        <strong className="font-medium">Sign-in isn&apos;t available yet.</strong> The database (Supabase) hasn&apos;t been
        connected. See <code className="text-xs">supabase/README.md</code> for the setup steps.
      </AuthNotice>
    );
  }

  // Already signed in as an admin? Skip the form.
  const current = await requireAdmin();
  if (current.ok) redirect(current.admin.mustChangePassword ? "/admin/reset-password?first=1" : (next ?? "/admin/dashboard"));

  return (
    <>
      {first("signed_out") && <AuthNotice tone="success">You&apos;ve been signed out.</AuthNotice>}
      {first("link") === "expired" && (
        <AuthNotice tone="error">
          That link has expired or was already used.{" "}
          <Link href="/admin/forgot-password" className="underline underline-offset-4">
            Request a new one
          </Link>
          .
        </AuthNotice>
      )}
      {next && !first("signed_out") && <AuthNotice tone="info">Please sign in to continue.</AuthNotice>}
      <SignInForm next={next} />
    </>
  );
}
