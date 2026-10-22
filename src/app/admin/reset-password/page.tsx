import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { AuthNotice, AuthShell } from "@/components/admin/auth-shell";
import { NewPasswordForm } from "@/components/admin/new-password-form";
import { isPreviewMode } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set a new password" };

/** Reached from a reset link, or forced on first sign-in with a temporary password. */
export default function ResetPasswordPage({ searchParams }: PageProps<"/admin/reset-password">) {
  return (
    <Suspense fallback={<AuthShell title="Set a new password"><div className="h-72 animate-pulse rounded-xl bg-white/60" /></AuthShell>}>
      <ResetContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetContent({ searchParams }: Pick<PageProps<"/admin/reset-password">, "searchParams">) {
  const firstSignIn = (await searchParams).first === "1";
  let email: string | undefined;

  if (isSupabaseConfigured) {
    const supabase = await createSessionSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/admin/login?link=expired");
    email = user.email;
  } else if (!isPreviewMode) {
    redirect("/admin/login");
  }

  return (
    <AuthShell
      title={firstSignIn ? "Choose your own password" : "Set a new password"}
      description={
        firstSignIn
          ? "You signed in with a temporary password. Choose a new one that only you know before continuing."
          : "Choose a new password for your admin account."
      }
      footer={
        <form action={signOut}>
          <button type="submit" className="text-charcoal underline-offset-4 hover:underline">
            Cancel and sign out
          </button>
        </form>
      }
    >
      {isPreviewMode && <AuthNotice tone="info">Preview: the form works, but nothing is saved until the database is connected.</AuthNotice>}
      {email && <p className="mb-4 text-sm text-muted">Account: <span className="text-charcoal">{email}</span></p>}
      <NewPasswordForm mode="reset" email={email} />
    </AuthShell>
  );
}
