/** Admin password rules — shown next to every new-password field and checked on the server. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 10 characters", test: (value: string) => value.length >= 10 },
  { id: "letter", label: "A letter", test: (value: string) => /[A-Za-z]/.test(value) },
  { id: "number", label: "A number", test: (value: string) => /[0-9]/.test(value) },
] as const;

export const MAX_PASSWORD_LENGTH = 72; // Supabase Auth (bcrypt) ignores anything longer.

export function passwordProblems(value: string): string[] {
  const problems: string[] = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((rule) => rule.label);
  if (value.length > MAX_PASSWORD_LENGTH) problems.push(`No more than ${MAX_PASSWORD_LENGTH} characters`);
  return problems;
}

/** Errors for a "new password + confirm" pair, or an empty object when it's acceptable. */
export function validateNewPassword(
  password: string,
  confirm: string,
  options: { current?: string } = {},
): { password?: string; confirm?: string } {
  const problems = passwordProblems(password);
  if (problems.length > 0) return { password: `Your password needs: ${problems.join(", ").toLowerCase()}.` };
  if (options.current !== undefined && password === options.current) {
    return { password: "Choose a password different from your current one." };
  }
  if (password !== confirm) return { confirm: "The two passwords don't match." };
  return {};
}

/** Only allow redirects to admin pages on this site (blocks open redirects like //evil.com). */
export function safeAdminPath(value: string | null | undefined, fallback = "/admin/dashboard"): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
