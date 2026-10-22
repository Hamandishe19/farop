import { cacheLife, cacheTag } from "next/cache";
import { defaultSettings } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicSupabaseClient } from "@/lib/supabase/server";
import { mergeSettings } from "@/lib/validation/settings";
import type { BusinessSettings } from "@/types/settings";

/** Cache tag to refresh after admins save settings (updateTag("settings")). */
export const SETTINGS_TAG = "settings";

/**
 * Business details shown on the website: the saved settings (Supabase
 * `site_settings` table) laid over the defaults in src/config/site.ts.
 * Without a database, the defaults.
 */
export async function getSettings(): Promise<BusinessSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);
  if (!isSupabaseConfigured) return defaultSettings;

  const { data, error } = await createPublicSupabaseClient()
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  // Fall back to the defaults rather than breaking every page.
  if (error) return defaultSettings;
  return mergeSettings(defaultSettings, data?.data as Partial<BusinessSettings> | undefined);
}
