import { normaliseWhatsAppNumber } from "../whatsapp.ts";
import { WEEKDAYS, type BusinessSettings, type OpeningHours, type Weekday } from "../../types/settings.ts";

/** Accept only https URLs on the expected social network host. */
export function socialUrl(value: string | undefined, hosts: string[]): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (url.protocol !== "https:" || !hosts.includes(host)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export const FACEBOOK_HOSTS = ["facebook.com", "fb.com"];
export const INSTAGRAM_HOSTS = ["instagram.com"];
export const MAX_HOURS_ROWS = 7;

/** Raw form input, kept as typed so the form can be re-shown after an error. */
export interface SettingsFormValues {
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  ecocashNumber: string;
  deliveryDays: Weekday[];
  hours: OpeningHours[];
}

export type SettingsFormErrors = Partial<Record<keyof SettingsFormValues, string>>;

function str(formData: FormData, key: string, max = 200): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function settingsToForm(settings: BusinessSettings): SettingsFormValues {
  return {
    whatsapp: settings.whatsapp ? `+${settings.whatsapp}` : "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    facebook: settings.facebook ?? "",
    instagram: settings.instagram ?? "",
    ecocashNumber: settings.ecocashNumber ?? "",
    deliveryDays: settings.deliveryDays,
    hours: settings.hours,
  };
}

export function readSettingsForm(formData: FormData): SettingsFormValues {
  const days = formData.getAll("hoursDays").map((value) => String(value).trim().slice(0, 80));
  const times = formData.getAll("hoursTime").map((value) => String(value).trim().slice(0, 40));
  return {
    whatsapp: str(formData, "whatsapp", 30),
    phone: str(formData, "phone", 30),
    email: str(formData, "email"),
    address: str(formData, "address", 300),
    facebook: str(formData, "facebook", 300),
    instagram: str(formData, "instagram", 300),
    ecocashNumber: str(formData, "ecocashNumber", 30),
    deliveryDays: WEEKDAYS.filter((day) => formData.getAll("deliveryDays").includes(day)),
    hours: days
      .slice(0, MAX_HOURS_ROWS)
      .map((day, index) => ({ days: day, time: times[index] ?? "" }))
      .filter((row) => row.days || row.time),
  };
}

/** Checks the form and, when valid, returns the cleaned settings to store. */
export function validateSettings(values: SettingsFormValues): {
  errors: SettingsFormErrors;
  settings?: BusinessSettings;
} {
  const errors: SettingsFormErrors = {};
  const whatsapp = values.whatsapp ? normaliseWhatsAppNumber(values.whatsapp) : undefined;
  if (values.whatsapp && !whatsapp) errors.whatsapp = "Use international format, e.g. +263 77 123 4567.";
  if (values.phone && !/^\+?[0-9][0-9\s()-]{6,24}$/.test(values.phone)) errors.phone = "Enter a valid phone number.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errors.email = "Enter a valid email address.";
  const facebook = socialUrl(values.facebook, FACEBOOK_HOSTS);
  if (values.facebook && !facebook) errors.facebook = "Use your page's full https://facebook.com/… address.";
  const instagram = socialUrl(values.instagram, INSTAGRAM_HOSTS);
  if (values.instagram && !instagram) errors.instagram = "Use your profile's full https://instagram.com/… address.";
  if (values.ecocashNumber && !/^[0-9\s]{9,15}$/.test(values.ecocashNumber)) {
    errors.ecocashNumber = "Enter the EcoCash number as customers dial it, e.g. 077 123 4567.";
  }
  if (values.hours.some((row) => !row.days || !row.time)) {
    errors.hours = "Fill in both the days and the hours on each row, or clear the row.";
  }
  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    settings: {
      whatsapp,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      facebook,
      instagram,
      ecocashNumber: values.ecocashNumber || undefined,
      deliveryDays: values.deliveryDays,
      hours: values.hours,
    },
  };
}

/** Saved settings (possibly from an older version) laid over the defaults. */
export function mergeSettings(defaults: BusinessSettings, stored: Partial<BusinessSettings> | null | undefined): BusinessSettings {
  if (!stored || typeof stored !== "object") return defaults;
  return {
    ...defaults,
    ...stored,
    deliveryDays: Array.isArray(stored.deliveryDays)
      ? WEEKDAYS.filter((day) => stored.deliveryDays?.includes(day))
      : defaults.deliveryDays,
    hours: Array.isArray(stored.hours) ? stored.hours : defaults.hours,
  };
}
