import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionSupabaseClient } from "@/lib/supabase/server";
import { safeAdminPath } from "@/lib/validation/password";

/**
 * Landing point for links in Supabase Auth emails (password reset). Turns the
 * one-time code into a signed-in session, then continues to `next`.
 * Supports both the default PKCE link (?code=) and token-hash email templates.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeAdminPath(searchParams.get("next"), "/admin/reset-password");
  const failed = NextResponse.redirect(new URL("/admin/login?link=expired", request.url));
  if (!isSupabaseConfigured) return failed;

  const supabase = await createSessionSupabaseClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing code") };

  if (error) return failed;
  return NextResponse.redirect(new URL(next, request.url));
}
