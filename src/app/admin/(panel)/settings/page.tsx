import type { Metadata } from "next";
import Link from "next/link";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { PAYMENT_METHODS, paymentMethodLabels } from "@/config/payments";
import { requireAdminPage } from "@/lib/auth/admin";
import { can } from "@/lib/auth/roles";
import { formatList } from "@/lib/format";
import { settingsToForm } from "@/lib/validation/settings";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Settings" };

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 py-3 text-sm sm:grid-cols-[200px_1fr] sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="break-words text-charcoal">{value || <span className="text-muted">Not set</span>}</dd>
    </div>
  );
}

export default async function AdminSettingsPage() {
  const [admin, settings] = await Promise.all([requireAdminPage("settings.view"), getSettings()]);
  const editable = can(admin.role, "settings.edit");

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description={
          editable
            ? "Business details shown across the website. Changes appear everywhere as soon as you save."
            : "Business details shown across the website. Only supreme and developer admins can change them."
        }
      />

      <div className="space-y-6">
        {editable ? (
          <SettingsForm initial={settingsToForm(settings)} />
        ) : (
          <>
            <AdminCard>
              <h2 className="text-sm font-medium">Contact</h2>
              <dl className="mt-2 divide-y divide-line">
                <Row label="WhatsApp" value={settings.whatsapp ? `+${settings.whatsapp}` : undefined} />
                <Row label="Phone" value={settings.phone} />
                <Row label="Email" value={settings.email} />
                <Row label="Address" value={settings.address} />
                <Row label="Facebook" value={settings.facebook} />
                <Row label="Instagram" value={settings.instagram} />
              </dl>
            </AdminCard>
            <AdminCard>
              <h2 className="text-sm font-medium">Orders &amp; delivery</h2>
              <dl className="mt-2 divide-y divide-line">
                <Row label="Payment methods" value={PAYMENT_METHODS.map((method) => paymentMethodLabels[method]).join(", ")} />
                <Row label="EcoCash number" value={settings.ecocashNumber} />
                <Row label="Delivery days" value={formatList(settings.deliveryDays)} />
                <Row label="Working hours" value={settings.hours.map((row) => `${row.days}: ${row.time}`).join(" · ")} />
              </dl>
            </AdminCard>
          </>
        )}

        {can(admin.role, "system.view") && (
          <p className="text-xs text-muted">
            Database, keys and technical details are on the{" "}
            <Link href="/admin/system" className="underline underline-offset-4 hover:text-charcoal">
              System health
            </Link>{" "}
            page.
          </p>
        )}
      </div>
    </>
  );
}
