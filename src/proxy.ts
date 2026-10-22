import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

/** Must match PREVIEW_SESSION_COOKIE in src/lib/auth/admin.ts (that module is server-only). */
const PREVIEW_SESSION_COOKIE = "farop_admin_preview_session";

/** Admin pages that work without being signed in. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/auth/callback"];

/**
 * Admin access gate.
 *
 * With Supabase configured: refreshes the sign-in session cookies and sends
 * signed-out visitors to /admin/login. The admin role itself is checked again
 * on every admin page and server action (requireAdmin) and by Row Level
 * Security — this redirect alone is not the security boundary.
 *
 * Without Supabase: production sends everything to the login screen (which
 * explains sign-in isn't available); development also starts at the login
 * screen, which opens a read-only preview.
 *
 * Either way, every admin page except the sign-in screens needs a sign-in first.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ADMIN_PATHS.includes(pathname);

  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    if (isPublic) return NextResponse.next();
    const previewSignedIn = process.env.NODE_ENV !== "production" && request.cookies.has(PREVIEW_SESSION_COOKIE);
    return previewSignedIn ? NextResponse.next() : NextResponse.redirect(loginUrl(request, pathname));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const redirect = NextResponse.redirect(loginUrl(request, pathname));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

/** The sign-in page, remembering which page they asked for so they come back to it. */
function loginUrl(request: NextRequest, pathname: string): URL {
  const login = new URL("/admin/login", request.url);
  if (pathname !== "/admin" && pathname !== "/admin/dashboard") login.searchParams.set("next", pathname);
  return login;
}
