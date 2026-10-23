"use client";

import { useState, useTransition } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { resetAdminPassword, type ActionResult } from "@/app/actions/team";
import { buttonClass } from "@/components/ui/button-styles";
import { passwordProblems } from "@/lib/validation/password";

/** A strong temporary password: 12 characters, always with letters and a number, no look-alike characters. */
function generatePassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (from: string, count: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(count)), (n) => from[n % from.length]).join("");
  const chars = (pick(letters, 9) + pick(digits, 3)).split("");
  const order = crypto.getRandomValues(new Uint32Array(chars.length));
  return chars.map((char, i) => ({ char, key: order[i] })).sort((a, b) => a.key - b.key).map((entry) => entry.char).join("");
}

/** Developer admins only: set a new temporary password for an admin who forgot theirs. */
export function ResetPasswordControl({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const problems = passwordProblems(password);
  const fieldId = `reset-${userId}`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setPassword(generatePassword());
          setResult(null);
        }}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-charcoal hover:bg-cream"
      >
        <KeyRound size={13} aria-hidden="true" />
        Reset password<span className="sr-only"> for {name}</span>
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-ivory/60 p-3">
      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-charcoal">
        New temporary password for {name}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={fieldId}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setPassword(generatePassword())}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          <RefreshCw size={13} aria-hidden="true" />
          New one
        </button>
        <button
          type="button"
          disabled={pending || problems.length > 0}
          onClick={() => startTransition(async () => setResult(await resetAdminPassword(userId, password)))}
          className={buttonClass({ size: "sm" })}
        >
          {pending ? "Setting…" : "Set password"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 text-xs text-muted hover:text-charcoal">
          Close
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {problems.length > 0
          ? `Needs: ${problems.join(", ").toLowerCase()}.`
          : "Share it with them privately. They'll be asked to choose their own password when they sign in. Their old password can't be seen by anyone — it's stored scrambled."}
      </p>
      {result && (
        <p role="status" className={`mt-2 text-xs ${result.ok ? "text-sage-deep" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
