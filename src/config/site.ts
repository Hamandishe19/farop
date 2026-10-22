/**
 * Central site configuration.
 *
 * `siteConfig` holds fixed details of the website itself. Business details
 * that admins can edit (contact numbers, social links, EcoCash, delivery
 * days, hours) start from `defaultSettings` below; read them through
 * getSettings() in src/services/settings.ts, which returns the saved values
 * once a database is connected. Anything left undefined is hidden on the site.
 *
 * NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER, NEXT_PUBLIC_FACEBOOK_URL and
 * NEXT_PUBLIC_INSTAGRAM_URL override the defaults per deployment.
 */

import { FACEBOOK_HOSTS, INSTAGRAM_HOSTS, socialUrl } from "@/lib/validation/settings";
import { normaliseWhatsAppNumber } from "@/lib/whatsapp";
import type { BusinessSettings } from "@/types/settings";

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** The official business number, used for both phone calls and WhatsApp. */
const BUSINESS_PHONE = "+263 77 477 3122";

/** The official Facebook page. */
const BUSINESS_FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61595037514699";

/** The official Instagram page — awaiting the address from the business owner. */
const BUSINESS_INSTAGRAM_URL: string | undefined = undefined;

export const defaultSettings: BusinessSettings = {
  whatsapp: normaliseWhatsAppNumber(cleanEnv(process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER) ?? BUSINESS_PHONE),
  phone: BUSINESS_PHONE,
  email: undefined,
  address: undefined,
  facebook: socialUrl(cleanEnv(process.env.NEXT_PUBLIC_FACEBOOK_URL) ?? BUSINESS_FACEBOOK_URL, FACEBOOK_HOSTS),
  instagram: socialUrl(cleanEnv(process.env.NEXT_PUBLIC_INSTAGRAM_URL) ?? BUSINESS_INSTAGRAM_URL, INSTAGRAM_HOSTS),
  ecocashNumber: "077 477 3122",
  deliveryDays: ["Thursday", "Saturday"],
  /** One row per group of days. Closed on Sundays. */
  hours: [
    { days: "Monday, Wednesday & Thursday", time: "06:00 – 21:00" },
    { days: "Tuesday & Friday", time: "06:00 – 15:00" },
    { days: "Saturday", time: "06:00 – 18:00" },
    { days: "Sunday", time: "Closed" },
  ],
};

export const siteConfig = {
  /**
   * Working brand name taken from the project name. Confirm with the business
   * owner and replace — along with the text wordmark — once the official
   * name and logo are supplied.
   */
  name: "Farop Clothing",
  shortName: "Farop",
  tagline: "Babywear, thoughtfully chosen",
  description:
    "Browse baby clothing, baby shoes and babywear essentials, then order through WhatsApp and pay cash on delivery or by EcoCash.",
  /**
   * Public URL of the deployed site, used for metadata and product links.
   * Falls back to Vercel's production domain when deployed there.
   */
  url:
    cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined),

  /** ISO 4217 code prices are shown in; pre-filled for new products in the admin. */
  currency: cleanEnv(process.env.NEXT_PUBLIC_CURRENCY) ?? "USD",

  theme: {
    background: "#fbf8f3",
    themeColor: "#fbf8f3",
  },
} as const;
