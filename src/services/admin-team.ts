import "server-only";

import { isAdminRole, type AdminRole } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";

export interface TeamMember {
  userId: string;
  name?: string;
  email?: string;
  role: AdminRole;
  createdAt: string;
}

/** Shown in the development preview only, so the Team page can be tried out. */
const previewTeam: TeamMember[] = [
  { userId: "preview-developer", name: "Developer (you)", email: "developer@example.com", role: "developer", createdAt: "2026-01-01T00:00:00Z" },
  { userId: "preview-supreme", name: "Shop owner", email: "owner@example.com", role: "supreme", createdAt: "2026-02-01T00:00:00Z" },
  { userId: "preview-regular", name: "Shop assistant", email: "assistant@example.com", role: "regular", createdAt: "2026-03-01T00:00:00Z" },
];

const roleOrder: Record<AdminRole, number> = { developer: 0, supreme: 1, regular: 2 };

/** Everyone with admin access, most senior first. Callers must have checked "team.view". */
export async function listTeam(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured) return previewTeam;
  const supabase = await createSessionSupabaseClient();
  const { data, error } = await supabase.from("admin_users").select("user_id, name, email, role, created_at");
  if (error) throw new Error(`Could not load the team: ${error.message}`);
  return (data ?? [])
    .filter((row) => isAdminRole(row.role))
    .map((row) => ({
      userId: row.user_id as string,
      name: (row.name as string | null) ?? undefined,
      email: (row.email as string | null) ?? undefined,
      role: row.role as AdminRole,
      createdAt: row.created_at as string,
    }))
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.createdAt.localeCompare(b.createdAt));
}
