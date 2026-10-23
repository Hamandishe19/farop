import type { Metadata } from "next";
import { AdminCard, AdminPageHeader, formatAdminDate } from "@/components/admin/admin-page-header";
import { AddAdminForm } from "@/components/admin/add-admin-form";
import { RoleBadge } from "@/components/admin/role-badge";
import { TeamMemberActions } from "@/components/admin/team-member-actions";
import { ResetPasswordControl } from "@/components/admin/reset-password-control";
import { TeamMemberGrants } from "@/components/admin/team-member-grants";
import { requireAdminPage } from "@/lib/auth/admin";
import { ADMIN_ROLES, assignableRoles, can, canManage, canSeeAdmin, grantLabels, roleDescriptions, roleLabels } from "@/lib/auth/roles";
import { listTeam } from "@/services/admin-team";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage() {
  const admin = await requireAdminPage("team.view");
  const team = await listTeam(admin.role);
  const canResetPasswords = can(admin.role, "team.passwords");
  const assignable = assignableRoles(admin.role);

  return (
    <>
      <AdminPageHeader
        title="Team"
        description={`${team.length} ${team.length === 1 ? "person has" : "people have"} admin access.`}
      />

      {admin.preview && (
        <p className="mb-5 rounded-lg bg-cream px-4 py-3 text-sm text-muted">
          These are example team members for the preview. Real admins appear here once the database is connected.
        </p>
      )}

      <AdminCard className="p-0">
        <ul className="divide-y divide-line">
          {team.map((member) => {
            const isSelf = member.userId === admin.userId;
            const manageable = !isSelf && canManage(admin.role, member.role);
            return (
              <li key={member.userId} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-charcoal">
                      {member.name ?? member.email}
                      {isSelf && <span className="text-xs font-normal text-muted">(you)</span>}
                      <RoleBadge role={member.role} />
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {member.email} · added {formatAdminDate(member.createdAt)}
                    </p>
                  </div>
                  {manageable ? (
                    <TeamMemberActions
                      userId={member.userId}
                      name={member.name ?? member.email ?? "this admin"}
                      role={member.role}
                      assignable={assignable}
                    />
                  ) : (
                    <p className="text-xs text-muted sm:text-right">
                      {isSelf
                        ? "You can't change your own access."
                        : member.role === "developer"
                          ? "Developer admins are managed in the database."
                          : "You can't change this admin's access."}
                    </p>
                  )}
                </div>
                {canResetPasswords && !isSelf && member.role !== "developer" && (
                  <ResetPasswordControl userId={member.userId} name={member.name ?? member.email ?? "this admin"} />
                )}
                {member.role === "regular" &&
                  (manageable ? (
                    <TeamMemberGrants userId={member.userId} name={member.name ?? member.email ?? "this admin"} grants={member.grants} />
                  ) : (
                    member.grants.length > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        Extra access: {member.grants.map((grant) => grantLabels[grant].label).join(", ")}
                      </p>
                    )
                  ))}
              </li>
            );
          })}
        </ul>
      </AdminCard>

      {assignable.length > 0 && (
        <AdminCard className="mt-6">
          <h2 className="text-sm font-medium">Add an admin</h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Creates their sign-in account. They can sign in at /admin/login with this email and the temporary password.
          </p>
          <AddAdminForm assignable={assignable} />
        </AdminCard>
      )}

      <AdminCard className="mt-6">
        <h2 className="text-sm font-medium">What each role can do</h2>
        <dl className="mt-3 space-y-3">
          {ADMIN_ROLES.filter((role) => canSeeAdmin(admin.role, role)).map((role) => (
            <div key={role} className="grid gap-1 text-sm sm:grid-cols-[150px_1fr] sm:gap-4">
              <dt className="font-medium text-charcoal">{roleLabels[role]}</dt>
              <dd className="text-muted">{roleDescriptions[role]}</dd>
            </div>
          ))}
        </dl>
      </AdminCard>
    </>
  );
}
