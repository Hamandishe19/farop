/**
 * Supabase configuration status.
 *
 * When both public credentials are set, the shop reads its catalogue from
 * Supabase and the admin area signs in with Supabase Auth. Without them the
 * site falls back to the built-in sample catalogue and the admin is a
 * read-only preview (development only).
 *
 * Security notes:
 *  - The browser only ever sees NEXT_PUBLIC_SUPABASE_URL and
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY. Row Level Security (supabase/schema.sql)
 *    protects every table.
 *  - SUPABASE_SERVICE_ROLE_KEY is read only in src/lib/supabase/service.ts
 *    (server-only), for adding and removing admin accounts.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Storage bucket for product photos (created by supabase/schema.sql). */
export const PRODUCT_IMAGES_BUCKET = "product-images";
