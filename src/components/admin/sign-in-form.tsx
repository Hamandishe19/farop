"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { AuthNotice } from "@/components/admin/auth-shell";
import { PasswordInput } from "@/components/admin/password-input";
import { buttonClass } from "@/components/ui/button-styles";

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { status: "idle" });

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <AuthNotice tone="error">{state.message}</AuthNotice>}
      {next && <input type="hidden" name="next" value={next} />}
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
      <PasswordInput id="password" name="password" label="Password" autoComplete="current-password" required />
      <div className="flex justify-end">
        <Link href="/admin/forgot-password" className="text-sm text-charcoal underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      <button type="submit" disabled={pending} className={buttonClass({ block: true, size: "lg" })}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
