import "server-only";

import { canSeeAdmin, isAdminRole, isGrantablePermission, type AdminRole, type GrantablePermission } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";

export interface TeamMember {
  userId: string;
  name?: string;
  email?: string;
  role: AdminRole;
  /** Extra permissions (regular admins only). */
  grants: GrantablePermission[];
  createdAt: string;
}

/** Shown in the development preview only, so the Team page can be tried out. */
const previewTeam: TeamMember[] = [
  { userId: "preview-developer", name: "Developer (you)", email: "developer@example.com", role: "developer", grants: [], createdAt: "2026-01-01T00:00:00Z" },
  { userId: "preview-supreme", name: "Shop owner", email: "owner@example.com", role: "supreme", grants: [], createdAt: "2026-02-01T00:00:00Z" },
  { userId: "preview-regular", name: "Shop assistant", email: "assistant@example.com", role: "regular", grants: ["finance.view"], createdAt: "2026-03-01T00:00:00Z" },
];

const roleOrder: Record<AdminRole, number> = { developer: 0, supreme: 1, regular: 2 };

/**
 * Everyone with admin access that `viewer` may see, most senior first. The
 * developer admin is only visible to the developer (the database enforces the
 * same rule). Callers must have checked "team.view".
 */
export async function listTeam(viewer: AdminRole): Promise<TeamMember[]> {
  const visible = (member: TeamMember) => canSeeAdmin(viewer, member.role);
  if (!isSupabaseConfigured) return previewTeam.filter(visible);
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("admin_users").select("user_id, name, email, role, permissions, created_at");
  if (error) throw new Error(`Could not load the team: ${error.message}`);
  return (data ?? [])
    .filter((row) => isAdminRole(row.role))
    .map((row) => ({
      userId: row.user_id as string,
      name: (row.name as string | null) ?? undefined,
      email: (row.email as string | null) ?? undefined,
      role: row.role as AdminRole,
      grants: Array.isArray(row.permissions) ? (row.permissions as unknown[]).filter(isGrantablePermission) : [],
      createdAt: row.created_at as string,
    }))
    .filter(visible)
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.createdAt.localeCompare(b.createdAt));
}
