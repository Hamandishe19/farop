"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { addAdmin, type AddAdminState } from "@/app/actions/team";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { roleDescriptions, roleLabels, type AdminRole } from "@/lib/auth/roles";

export function AddAdminForm({ assignable }: { assignable: AdminRole[] }) {
  const [state, action, pending] = useActionState<AddAdminState, FormData>(addAdmin, { status: "idle" });
  const errors = state.status === "error" ? state.errors : {};
  const values = state.status === "error" ? state.values : undefined;

  const input = (error?: string) =>
    cn(
      "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-sage-deep",
      error ? "border-danger/60" : "border-line",
    );
  const err = (key: keyof typeof errors) =>
    errors[key] && (
      <p id={`add-${key}-error`} className="mt-1 text-xs text-danger">
        {errors[key]}
      </p>
    );
  const a11y = (key: keyof typeof errors) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `add-${key}-error` : undefined,
  });

  return (
    <form action={action} noValidate className="space-y-4">
      {state.status === "error" && (
        <p role="alert" className="flex gap-2 rounded-lg bg-blush-soft px-3.5 py-3 text-sm text-charcoal">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          {state.message}
        </p>
      )}
      {state.status === "added" && (
        <p role="status" className="flex gap-2 rounded-lg bg-sage-soft px-3.5 py-3 text-sm text-charcoal">
          <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-deep" />
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="add-name" className="mb-1.5 block text-sm">Name</label>
          <input id="add-name" name="name" autoComplete="off" defaultValue={values?.name} className={input(errors.name)} {...a11y("name")} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="add-email" className="mb-1.5 block text-sm">Email (used to sign in)</label>
          <input id="add-email" name="email" type="email" autoComplete="off" defaultValue={values?.email} className={input(errors.email)} {...a11y("email")} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="add-password" className="mb-1.5 block text-sm">Temporary password</label>
          <input id="add-password" name="password" type="text" autoComplete="new-password" className={input(errors.password)} {...a11y("password")} />
          {err("password")}
          <p className="mt-1 text-xs text-muted">At least 10 characters. Share it with them privately.</p>
        </div>
      </div>

      <fieldset {...a11y("role")}>
        <legend className="mb-2 text-sm">Role</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {assignable.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white px-3.5 py-3 transition-colors hover:border-brown/40 has-[:checked]:border-brown has-[:checked]:bg-brown/5"
            >
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={(values?.role ?? assignable[0]) === role}
                className="mt-1 accent-brown"
              />
              <span>
                <span className="block text-sm font-medium text-charcoal">{roleLabels[role]}</span>
                <span className="block text-xs text-muted">{roleDescriptions[role]}</span>
              </span>
            </label>
          ))}
        </div>
        {err("role")}
      </fieldset>

      <button type="submit" disabled={pending} className={buttonClass({ size: "sm" })}>
        {pending ? "Adding…" : "Add admin"}
      </button>
    </form>
  );
}
