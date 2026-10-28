/**
 * Works out which fields an admin changed, as display text for the Activity
 * log. Kept free of Supabase imports so it can be unit tested.
 */

import type { ActivityChange } from "../../types/admin-log.ts";

/** Longest value kept in the log; longer text is shortened with "…". */
const MAX_LENGTH = 200;

/** A value as plain text, or null when blank. */
export function displayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const parts = value.map(displayValue).filter((part): part is string => part !== null);
    // Lists of objects (e.g. opening hours) read better separated by semicolons.
    return parts.length ? shorten(parts.join(value.some((item) => typeof item === "object") ? "; " : ", ")) : null;
  }
  if (typeof value === "object") {
    const parts = Object.values(value).map(displayValue).filter((part): part is string => part !== null);
    return parts.length ? shorten(parts.join(" ")) : null;
  }
  const text = String(value).trim();
  return text === "" ? null : shorten(text);
}

function shorten(text: string): string {
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;
}

/**
 * The fields listed in `labels` whose value differs between `before` and
 * `after`, in the order of `labels`. Fields in `hidden` are reported as
 * changed without their values (e.g. photo addresses).
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
  hidden: readonly string[] = [],
): ActivityChange[] {
  return Object.entries(labels).flatMap(([key, field]) => {
    const from = displayValue(before[key]);
    const to = displayValue(after[key]);
    if (from === to) return [];
    if (hidden.includes(key)) return [{ field, from: null, to: null }];
    return [{ field, from, to }];
  });
}
