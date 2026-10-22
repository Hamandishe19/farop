"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { PASSWORD_RULES } from "@/lib/validation/password";

/** Password field with a show/hide button and a Caps Lock warning. */
export function PasswordInput({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const describedBy = [error && `${id}-error`, capsLock && `${id}-caps`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  const checkCaps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          onKeyDown={checkCaps}
          onKeyUp={checkCaps}
          onBlur={() => setCapsLock(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-lg border bg-white py-3 pl-4 pr-12 text-sm text-charcoal focus:border-sage-deep",
            error ? "border-danger/60" : "border-line",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted hover:text-charcoal"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          <span className="sr-only">{visible ? "Hide password" : "Show password"}</span>
        </button>
      </div>
      {capsLock && (
        <p id={`${id}-caps`} className="mt-1 text-xs text-brown">
          Caps Lock is on.
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      {hint && <div id={`${id}-hint`}>{hint}</div>}
    </div>
  );
}

/** Live checklist of the password rules for a new password. */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-2 grid gap-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={cn("flex items-center gap-1.5", met ? "text-sage-deep" : "text-muted")}>
            {met ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}
            {rule.label}
            <span className="sr-only">{met ? " — done" : " — not yet"}</span>
          </li>
        );
      })}
    </ul>
  );
}
