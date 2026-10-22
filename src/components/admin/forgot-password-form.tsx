"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordReset, type ResetRequestState } from "@/app/actions/auth";
import { AuthNotice } from "@/components/admin/auth-shell";
import { buttonClass } from "@/components/ui/button-styles";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(requestPasswordReset, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl border border-line bg-white p-5">
        <MailCheck size={24} aria-hidden="true" className="text-sage-deep" />
        <p className="mt-3 font-medium text-charcoal">Check your email</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          If <strong className="font-medium text-charcoal">{state.email}</strong> belongs to an admin account, we&apos;ve
          sent a link to set a new password. Open it on this device and browser. The link expires after an hour.
        </p>
        <p className="mt-3 text-xs text-muted">Nothing arrived? Check your spam folder, or ask a supreme or developer admin for help.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <AuthNotice tone="error">{state.message}</AuthNotice>}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
          defaultValue={state.status === "error" ? state.email : undefined}
          className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-charcoal focus:border-sage-deep"
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClass({ block: true, size: "lg" })}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
