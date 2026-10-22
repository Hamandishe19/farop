import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-page-header";
import { NewPasswordForm } from "@/components/admin/new-password-form";
import { RoleBadge } from "@/components/admin/role-badge";
import { buttonClass } from "@/components/ui/button-styles";
import { requireAdminPage } from "@/lib/auth/admin";
import { roleDescriptions } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const admin = await requireAdminPage();

  return (
    <>
      <AdminPageHeader title="My account" description="Your sign-in details and password." />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <AdminCard>
          <h2 className="text-sm font-medium">Profile</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Name</dt>
              <dd className="mt-0.5 text-charcoal">{admin.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Email (used to sign in)</dt>
              <dd className="mt-0.5 break-words text-charcoal">{admin.email ?? (admin.preview ? "Preview — no account" : "—")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Role</dt>
              <dd className="mt-1">
                <RoleBadge role={admin.role} />
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{roleDescriptions[admin.role]}</p>
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted">To change your name, email or role, ask a supreme or developer admin.</p>
          <form action={signOut} className="mt-5 border-t border-line pt-5">
            <button type="submit" className={buttonClass({ variant: "secondary", size: "sm" })}>
              <LogOut size={14} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </AdminCard>

        <AdminCard>
          <h2 className="text-sm font-medium">Change password</h2>
          <p className="mb-4 mt-1 text-xs text-muted">You&apos;ll stay signed in on this device.</p>
          <NewPasswordForm mode="change" email={admin.email} />
        </AdminCard>
      </div>
    </>
  );
}
