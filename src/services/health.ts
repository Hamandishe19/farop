import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import nextPackage from "next/package.json";
import { siteConfig } from "@/config/site";
import { catalogueChecks } from "@/lib/health/catalogue-checks";
import type { HealthCheck, HealthSection } from "@/lib/health/types";
import { isSupabaseConfigured, PRODUCT_IMAGES_BUCKET, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import { createPublicSupabaseClient, createSessionSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient, isTeamManagementConfigured } from "@/lib/supabase/service";
import { listAdminProducts } from "@/services/admin-products";
import { getSettings } from "@/services/settings";
import type { Product } from "@/types/product";

const TIMEOUT_MS = 8000;
const production = process.env.NODE_ENV === "production";

/** Runs a check with a timer and a timeout; a thrown error becomes a failed check. */
async function timed(
  id: string,
  label: string,
  run: () => Promise<Omit<HealthCheck, "id" | "label" | "durationMs">>,
): Promise<HealthCheck> {
  const started = performance.now();
  try {
    const result = await Promise.race([
      run(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`No answer after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)),
    ]);
    return { id, label, ...result, durationMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      id,
      label,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
      durationMs: Math.round(performance.now() - started),
    };
  }
}

const skipped = (id: string, label: string, detail: string, fix?: string): HealthCheck => ({ id, label, status: "skip", detail, fix });

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export interface RuntimeInfo {
  environment: string;
  nextVersion: string;
  nodeVersion: string;
  platform: string;
  region?: string;
  commit?: string;
  deployment?: string;
  uptimeSeconds: number;
  memoryMb: number;
  serverTime: string;
}

export function getRuntimeInfo(): RuntimeInfo {
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    nextVersion: nextPackage.version,
    nodeVersion: process.version,
    platform: `${process.platform} ${process.arch}`,
    region: process.env.VERCEL_REGION,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    deployment: process.env.VERCEL_URL,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    serverTime: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

async function configurationChecks(): Promise<HealthCheck[]> {
  const settings = await getSettings();
  const checks: HealthCheck[] = [];

  checks.push(
    isSupabaseConfigured
      ? { id: "env-supabase", label: "Database keys", status: "ok", detail: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set." }
      : {
          id: "env-supabase",
          label: "Database keys",
          status: production ? "fail" : "warn",
          detail: "Supabase isn't configured, so the shop shows sample products and nobody can sign in to the admin.",
          fix: "Follow supabase/README.md, then set the two NEXT_PUBLIC_SUPABASE_* variables.",
        },
  );

  checks.push(
    isTeamManagementConfigured
      ? { id: "env-service", label: "Team management key", status: "ok", detail: "SUPABASE_SERVICE_ROLE_KEY is set (server-only)." }
      : {
          id: "env-service",
          label: "Team management key",
          status: isSupabaseConfigured ? "warn" : "skip",
          detail: "Without SUPABASE_SERVICE_ROLE_KEY, admins can't be added or removed from the Team page.",
          fix: "Add SUPABASE_SERVICE_ROLE_KEY to the server environment (never with a NEXT_PUBLIC_ prefix).",
        },
  );

  // Anything secret-looking with NEXT_PUBLIC_ is bundled into the browser for everyone to read.
  const leaked = Object.keys(process.env).filter(
    (name) => name.startsWith("NEXT_PUBLIC_") && /SERVICE|SECRET|PRIVATE|PASSWORD/i.test(name),
  );
  checks.push(
    leaked.length === 0
      ? { id: "env-secrets", label: "Secrets kept private", status: "ok", detail: "No secret-looking variable is exposed to browsers." }
      : {
          id: "env-secrets",
          label: "Secrets kept private",
          status: "fail",
          detail: "These variables start with NEXT_PUBLIC_, so anyone can read them in the browser.",
          fix: "Rename them without NEXT_PUBLIC_, rotate the exposed keys, and redeploy.",
          items: leaked,
        },
  );

  checks.push(
    siteConfig.url
      ? { id: "env-site-url", label: "Website address", status: "ok", detail: siteConfig.url }
      : {
          id: "env-site-url",
          label: "Website address",
          status: production ? "warn" : "skip",
          detail: "The public address isn't known, so product enquiries on WhatsApp don't include a link.",
          fix: "Set NEXT_PUBLIC_SITE_URL (e.g. https://faropclothing.com). On Vercel it's detected automatically.",
        },
  );

  checks.push(
    settings.whatsapp
      ? { id: "settings-whatsapp", label: "WhatsApp ordering", status: "ok", detail: `Orders go to +${settings.whatsapp}.` }
      : {
          id: "settings-whatsapp",
          label: "WhatsApp ordering",
          status: "fail",
          detail: "No WhatsApp number is set, so customers can't place orders or send enquiries.",
          fix: "Add the WhatsApp number in Admin → Settings.",
        },
  );

  checks.push(
    settings.ecocashNumber
      ? { id: "settings-ecocash", label: "EcoCash number", status: "ok", detail: settings.ecocashNumber }
      : {
          id: "settings-ecocash",
          label: "EcoCash number",
          status: "warn",
          detail: "No EcoCash number is set, so EcoCash customers aren't told where to pay.",
          fix: "Add it in Admin → Settings.",
        },
  );

  checks.push(
    settings.deliveryDays.length > 0
      ? { id: "settings-delivery", label: "Delivery days", status: "ok", detail: settings.deliveryDays.join(", ") }
      : {
          id: "settings-delivery",
          label: "Delivery days",
          status: "warn",
          detail: "No delivery days are set, so checkout doesn't say when orders arrive.",
          fix: "Tick the delivery days in Admin → Settings.",
        },
  );

  const major = Number(process.versions.node.split(".")[0]);
  checks.push(
    major >= 20
      ? { id: "runtime-node", label: "Node.js version", status: "ok", detail: process.version }
      : {
          id: "runtime-node",
          label: "Node.js version",
          status: "fail",
          detail: `${process.version} is older than this site supports.`,
          fix: "Use Node.js 20 or newer.",
        },
  );

  return checks;
}

// ---------------------------------------------------------------------------
// Database (Supabase)
// ---------------------------------------------------------------------------

async function databaseChecks(): Promise<HealthCheck[]> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) {
    const fix = "Connect Supabase (see supabase/README.md).";
    return [
      skipped("db-auth", "Sign-in service", "Not checked — the database isn't connected.", fix),
      skipped("db-products", "Products table", "Not checked — the database isn't connected."),
      skipped("db-settings", "Settings table", "Not checked — the database isn't connected."),
      skipped("db-rls", "Security rules", "Not checked — the database isn't connected."),
      skipped("db-admins", "Admin accounts", "Not checked — the database isn't connected."),
      skipped("db-storage", "Photo storage", "Not checked — the database isn't connected."),
    ];
  }

  const anonKey = supabaseAnonKey;
  const anon = createPublicSupabaseClient();
  const session = await createSessionSupabaseClient();

  return Promise.all([
    timed("db-auth", "Sign-in service", async () => {
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: anonKey }, cache: "no-store" });
      return response.ok
        ? { status: "ok", detail: "Supabase Auth is answering." }
        : { status: "fail", detail: `Supabase Auth answered ${response.status}.`, fix: "Check the project status at supabase.com." };
    }),

    timed("db-products", "Products table", async () => {
      const { count, error } = await anon.from("products").select("id", { count: "exact", head: true });
      if (error) return { status: "fail", detail: error.message, fix: "Run supabase/schema.sql in the SQL Editor." };
      return { status: "ok", detail: `Reachable · ${count ?? 0} products visible to the public.` };
    }),

    timed("db-settings", "Settings table", async () => {
      const { data, error } = await anon.from("site_settings").select("updated_at").eq("id", 1).maybeSingle();
      if (error) return { status: "fail", detail: error.message, fix: "Run supabase/schema.sql in the SQL Editor." };
      return {
        status: "ok",
        detail: data ? `Saved settings in use (last changed ${new Date(data.updated_at).toLocaleString("en-GB")}).` : "Reachable · using the default settings (nothing saved yet).",
      };
    }),

    timed("db-rls", "Security rules", async () => {
      const problems: string[] = [];
      const { data: hiddenForPublic, error: productsError } = await anon.from("products").select("id").eq("active", false).limit(1);
      if (productsError) throw new Error(productsError.message);
      if (hiddenForPublic.length > 0) problems.push("Hidden products can be read by the public.");
      const { data: adminsForPublic } = await anon.from("admin_users").select("user_id").limit(1);
      if ((adminsForPublic?.length ?? 0) > 0) problems.push("The admin list can be read by the public.");
      return problems.length === 0
        ? { status: "ok", detail: "The public can't see hidden products or the admin list." }
        : { status: "fail", detail: "Row Level Security is letting the public see private data.", fix: "Re-run supabase/schema.sql.", items: problems };
    }),

    timed("db-admins", "Admin accounts", async () => {
      const { data, error } = await session.from("admin_users").select("role");
      if (error) return { status: "fail", detail: error.message };
      const developers = data.filter((row) => row.role === "developer").length;
      const supremes = data.filter((row) => row.role === "supreme").length;
      const summary = `${data.length} admins · ${developers} developer · ${supremes} supreme · ${data.length - developers - supremes} regular`;
      if (developers === 0) return { status: "fail", detail: `${summary}. Nobody can manage supreme admins.`, fix: "Add the developer admin with the SQL in supabase/README.md." };
      if (developers > 1) return { status: "fail", detail: `${summary}. Only one developer admin is allowed.`, fix: "Change the extra developer's role in the database, then re-run supabase/schema.sql." };
      if (supremes === 0) return { status: "warn", detail: `${summary}. The business owner has no supreme admin account yet.`, fix: "Add one on the Team page." };
      return { status: "ok", detail: summary };
    }),

    isTeamManagementConfigured
      ? timed("db-storage", "Photo storage", async () => {
          const { data, error } = await createServiceSupabaseClient().storage.getBucket(PRODUCT_IMAGES_BUCKET);
          if (error || !data) return { status: "fail", detail: error?.message ?? "Bucket not found.", fix: "Run supabase/schema.sql to create it." };
          return data.public
            ? { status: "ok", detail: `“${PRODUCT_IMAGES_BUCKET}” bucket exists and is public.` }
            : { status: "fail", detail: "The photo bucket isn't public, so customers can't see product photos.", fix: "Re-run supabase/schema.sql." };
        })
      : Promise.resolve(skipped("db-storage", "Photo storage", "Needs SUPABASE_SERVICE_ROLE_KEY to inspect the bucket.")),
  ]);
}

// ---------------------------------------------------------------------------
// Product photos (do the files actually load?)
// ---------------------------------------------------------------------------

async function photoCheck(products: Product[]): Promise<HealthCheck> {
  const withPhotos = products.filter((product) => product.active && product.image).slice(0, 60);
  if (withPhotos.length === 0) return skipped("photos-load", "Photo files", "No visible products have photos to check.");

  return timed("photos-load", "Photo files", async () => {
    const publicDir = path.join(process.cwd(), "public");
    const canCheckLocal = existsSync(publicDir);
    const results = await Promise.all(
      withPhotos.map(async (product) => {
        const src = product.image!.src;
        if (src.startsWith("/")) return canCheckLocal ? existsSync(path.join(publicDir, src)) : true;
        try {
          const response = await fetch(src, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(5000) });
          return response.ok;
        } catch {
          return false;
        }
      }),
    );
    const broken = withPhotos.filter((_, index) => !results[index]);
    return broken.length === 0
      ? { status: "ok", detail: `All ${withPhotos.length} product photos load.` }
      : {
          status: "fail",
          detail: `${broken.length} of ${withPhotos.length} product photos are missing or don't load.`,
          fix: "Re-upload the photo for these products.",
          items: broken.map((product) => product.name),
        };
  });
}

// ---------------------------------------------------------------------------

/** Everything on the System page. Callers must have checked the "system.view" permission. */
export async function runHealthChecks(): Promise<HealthSection[]> {
  const productsPromise = listAdminProducts();
  const [configuration, database, products] = await Promise.all([
    configurationChecks(),
    databaseChecks(),
    productsPromise.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error: error instanceof Error ? error.message : String(error) }),
    ),
  ]);

  const catalogue: HealthCheck[] = products.ok
    ? [...catalogueChecks(products.value, { production }), await photoCheck(products.value)]
    : [{ id: "catalogue-load", label: "Load products", status: "fail", detail: products.error, fix: "See the Database checks above." }];

  return [
    {
      id: "configuration",
      title: "Configuration",
      description: "Environment variables and business settings the site depends on.",
      checks: configuration,
    },
    {
      id: "database",
      title: "Database & services",
      description: "Live checks against Supabase: reachability, tables, security rules, accounts and storage.",
      checks: database,
    },
    {
      id: "catalogue",
      title: "Catalogue",
      description: "Data quality of the products customers see.",
      checks: catalogue,
    },
  ];
}
