"use client";

import { useActionState, useState } from "react";
import { changePassword, setNewPassword, type PasswordState } from "@/app/actions/auth";
import { AuthNotice } from "@/components/admin/auth-shell";
import { PasswordInput, PasswordRules } from "@/components/admin/password-input";
import { buttonClass } from "@/components/ui/button-styles";

/**
 * "reset": after a reset link or on first sign-in (no current password).
 * "change": from the account page (needs the current password).
 */
export function NewPasswordForm({ mode, email }: { mode: "reset" | "change"; email?: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    mode === "reset" ? setNewPassword : changePassword,
    { status: "idle" },
  );
  const [password, setPassword] = useState("");
  // React empties the fields after each submit; keep the rules checklist in step.
  const [passwordFor, setPasswordFor] = useState(state);
  if (passwordFor !== state) {
    setPasswordFor(state);
    setPassword("");
  }
  const errors = state.status === "error" ? state.errors : {};

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && state.message && <AuthNotice tone="error">{state.message}</AuthNotice>}
      {state.status === "saved" && <AuthNotice tone="success">{state.message}</AuthNotice>}

      {/* Lets password managers save the new password against the right account. */}
      {email && <input type="email" name="username" autoComplete="username" value={email} hidden readOnly />}

      {mode === "change" && (
        <PasswordInput id="current" name="current" label="Current password" autoComplete="current-password" required error={errors.current} />
      )}
      <PasswordInput
        id="password"
        name="password"
        label="New password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
        hint={<PasswordRules value={password} />}
      />
      <PasswordInput id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" required error={errors.confirm} />

      <button type="submit" disabled={pending} className={buttonClass({ block: mode === "reset", size: mode === "reset" ? "lg" : "md" })}>
        {pending ? "Saving…" : mode === "reset" ? "Save new password" : "Change password"}
      </button>
    </form>
  );
}
