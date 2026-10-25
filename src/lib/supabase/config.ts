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

/**
 * The project's base address only. Supabase's dashboard also shows longer
 * addresses (…/rest/v1/); pasting one of those would break every request,
 * so anything after the host is dropped.
 */
export function normaliseSupabaseUrl(value: string | undefined): string | undefined {
  const raw = value?.trim().replace(/^["']|["']$/g, "");
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

export const supabaseUrl = normaliseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Storage bucket for product photos (created by supabase/schema.sql). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Public URL of an uploaded photo → its path inside the bucket (undefined if it isn't one of ours). */
export function storagePath(url: string | null | undefined): string | undefined {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const index = url?.indexOf(marker) ?? -1;
  return url && index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : undefined;
}
