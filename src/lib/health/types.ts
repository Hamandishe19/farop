export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export interface HealthCheck {
  id: string;
  label: string;
  status: CheckStatus;
  /** What was found, in plain words. */
  detail: string;
  /** What to do about it, when not ok. */
  fix?: string;
  durationMs?: number;
  /** Items behind the result, e.g. which products have no photo. */
  items?: string[];
}

export interface HealthSection {
  id: string;
  title: string;
  description: string;
  checks: HealthCheck[];
}

const rank: Record<CheckStatus, number> = { fail: 3, warn: 2, ok: 1, skip: 0 };

/** The worst status among the checks ("skip" only when nothing ran). */
export function overallStatus(checks: HealthCheck[]): CheckStatus {
  return checks.reduce<CheckStatus>((worst, check) => (rank[check.status] > rank[worst] ? check.status : worst), "skip");
}

export function countByStatus(checks: HealthCheck[]): Record<CheckStatus, number> {
  const counts: Record<CheckStatus, number> = { ok: 0, warn: 0, fail: 0, skip: 0 };
  for (const check of checks) counts[check.status] += 1;
  return counts;
}
