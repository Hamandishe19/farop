import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Anonymous client for public catalogue reads. It carries no user session, so
 * Row Level Security only returns active products. Safe inside "use cache".
 */
export function createPublicSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase is not configured.");
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Client acting as the signed-in user (session from cookies). Used by admin
 * pages and server actions — every query is still checked by RLS.
 */
export async function createSessionSupabaseClient(): Promise<SupabaseClient> {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase is not configured.");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session cookies on every admin request.
        }
      },
    },
  });
}
