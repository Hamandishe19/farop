import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/config";

/**
 * Service-role key: bypasses Row Level Security. Used ONLY by the team
 * management actions (creating and removing admin sign-in accounts), and only
 * after the caller's role has been checked. Server-only — never prefix it
 * with NEXT_PUBLIC_ and never import this file from client code.
 */
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;

export const isTeamManagementConfigured = Boolean(supabaseUrl && serviceRoleKey);

export function createServiceSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
