"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { isPreviewMode, refusalMessage, requireAdmin } from "@/lib/auth/admin";
import type { HealthCheck } from "@/lib/health/types";
import { CATEGORIES_TAG } from "@/services/categories";
import { getActiveProducts, PRODUCTS_TAG } from "@/services/products";
import { SETTINGS_TAG } from "@/services/settings";

/** Developer tools on the System page. Every action requires the "system.view" permission. */
async function requireDeveloper(): Promise<string | null> {
  if (isPreviewMode) return null; // Development preview: the developer tools are safe to try.
  const auth = await requireAdmin("system.view");
  return auth.ok ? null : refusalMessage(auth.reason);
}

export type PageCheckResult = { ok: true; checks: HealthCheck[] } | { ok: false; message: string };

/** Loads every public page the way a customer would and reports status and speed. */
export async function runPageChecks(): Promise<PageCheckResult> {
  const refused = await requireDeveloper();
  if (refused) return { ok: false, message: refused };

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return { ok: false, message: "Couldn't work out this site's address." };
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = `${protocol}://${host}`;

  const firstProduct = (await getActiveProducts())[0];
  const pages: Array<{ path: string; label: string }> = [
    { path: "/", label: "Home" },
    { path: "/boys", label: "Boys" },
    { path: "/girls", label: "Girls" },
    { path: "/babywear", label: "Babywear" },
    { path: "/shoes", label: "Shoes" },
    ...(firstProduct ? [{ path: `/products/${firstProduct.slug}`, label: `Product page (${firstProduct.name})` }] : []),
    { path: "/cart", label: "Cart & checkout" },
    { path: "/contact", label: "Contact & FAQs" },
    { path: "/about", label: "About" },
    { path: "/admin/login", label: "Admin sign-in" },
    { path: "/manifest.webmanifest", label: "App manifest (install)" },
    { path: "/sw.js", label: "Offline support (service worker)" },
    { path: "/robots.txt", label: "robots.txt" },
  ];

  const checks = await Promise.all(
    pages.map(async ({ path, label }): Promise<HealthCheck> => {
      const started = performance.now();
      try {
        const response = await fetch(base + path, {
          cache: "no-store",
          redirect: "manual",
          signal: AbortSignal.timeout(15000),
        });
        const durationMs = Math.round(performance.now() - started);
        const slow = durationMs > 3000;
        if (!response.ok) {
          return { id: path, label, status: "fail", detail: `${path} answered ${response.status}.`, durationMs };
        }
        return {
          id: path,
          label,
          status: slow ? "warn" : "ok",
          detail: slow ? `${path} loaded, but slowly.` : `${path} loaded.`,
          fix: slow ? "Slow the first time after a deploy is normal; if it stays slow, check the database checks." : undefined,
          durationMs,
        };
      } catch (error) {
        return {
          id: path,
          label,
          status: "fail",
          detail: `${path} didn't load: ${error instanceof Error ? error.message : String(error)}`,
          durationMs: Math.round(performance.now() - started),
        };
      }
    }),
  );
  return { ok: true, checks };
}

/** Clears the cached products, categories and settings so every page shows the latest data. */
export async function refreshSiteData(): Promise<{ ok: boolean; message: string }> {
  const refused = await requireDeveloper();
  if (refused) return { ok: false, message: refused };
  updateTag(PRODUCTS_TAG);
  updateTag(CATEGORIES_TAG);
  updateTag(SETTINGS_TAG);
  return { ok: true, message: "Cached products, categories and settings were cleared. Pages will load fresh data." };
}
