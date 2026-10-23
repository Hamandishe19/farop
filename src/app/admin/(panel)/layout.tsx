import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Lock, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { PreviewRoleSwitcher } from "@/components/admin/preview-role-switcher";
import { RoleBadge } from "@/components/admin/role-badge";
import { siteConfig } from "@/config/site";
import { requireAdminPage } from "@/lib/auth/admin";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

/** Checks the signed-in admin (or redirects to sign-in) before any admin page renders. */
async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <div className="flex flex-1 flex-col">
      {admin.preview && (
        <div role="note" className="border-b border-blush bg-blush-soft">
          <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-sm text-charcoal sm:px-6">
            <Lock size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
            <span>
              <strong className="font-medium">Development preview.</strong> The database isn&apos;t connected, so
              nothing can be saved and the sample products are shown. Use “Preview as” to see each admin role.
              This preview is not reachable on the live site.
            </span>
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="mb-5 flex items-start justify-between gap-3 lg:block">
            <div>
              <p className="font-display text-xl text-charcoal">
                {siteConfig.shortName} <span className="font-sans text-sm text-muted">Admin</span>
              </p>
              <RoleBadge role={admin.role} className="mt-1.5" />
            </div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-charcoal lg:mt-3">
              View site <ExternalLink size={12} aria-hidden="true" />
            </Link>
          </div>
          <AdminNav role={admin.role} grants={admin.grants} />
          {admin.preview && <PreviewRoleSwitcher role={admin.role} hasFinanceGrant={admin.grants.length > 0} />}
          <form action={signOut} className="mt-4 border-t border-line pt-4 lg:mt-6">
            <p className="mb-2 truncate px-3 text-xs text-muted">
              Signed in as {admin.preview ? "preview" : (admin.name ?? admin.email)}
            </p>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-charcoal/75 transition-colors hover:bg-white/60"
            >
              <LogOut size={16} strokeWidth={1.7} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </aside>
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminShellFallback() {
  return (
    <div aria-busy="true" aria-label="Loading admin" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
      <div className="h-40 animate-pulse rounded-xl bg-white/60 lg:w-56" />
      <div className="h-96 flex-1 animate-pulse rounded-xl bg-white/60" />
    </div>
  );
}
