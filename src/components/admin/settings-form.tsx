"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { saveSettings, type SettingsFormState } from "@/app/actions/team";
import { buttonClass } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { MAX_HOURS_ROWS, type SettingsFormValues } from "@/lib/validation/settings";
import { WEEKDAYS } from "@/types/settings";

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(saveSettings, { status: "idle" });
  const values = state.status === "idle" ? initial : state.values;
  const errors = state.status === "invalid" ? state.errors : {};

  // Hours rows are edited locally so rows can be added and removed; reset whenever the server replies.
  const [rows, setRows] = useState(values.hours);
  const [rowsFor, setRowsFor] = useState(state);
  if (rowsFor !== state) {
    setRowsFor(state);
    setRows(values.hours);
  }

  const input = (error?: string) =>
    cn(
      "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-sage-deep",
      error ? "border-danger/60" : "border-line",
    );
  const err = (key: keyof SettingsFormValues) =>
    errors[key] && (
      <p id={`settings-${key}-error`} className="mt-1 text-xs text-danger">
        {errors[key]}
      </p>
    );
  const a11y = (key: keyof SettingsFormValues) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `settings-${key}-error` : undefined,
  });
  const field = (key: keyof SettingsFormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`settings-${key}`} className="mb-1.5 block text-sm">{label}</label>
      <input
        id={`settings-${key}`}
        name={key}
        defaultValue={values[key] as string}
        className={input(errors[key])}
        {...a11y(key)}
        {...props}
      />
      {err(key)}
    </div>
  );

  return (
    <form action={action} noValidate className="space-y-6">
      {(state.status === "refused" || state.status === "invalid") && (
        <p role="alert" className="flex gap-2 rounded-lg bg-blush-soft px-4 py-3 text-sm text-charcoal">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
          {state.status === "refused" ? state.message : "Please correct the highlighted fields."}
        </p>
      )}
      {state.status === "saved" && (
        <p role="status" className="flex gap-2 rounded-lg bg-sage-soft px-4 py-3 text-sm text-charcoal">
          <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-sage-deep" />
          {state.message}
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="mb-4 text-sm font-medium">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("whatsapp", "WhatsApp number", { type: "tel", placeholder: "+263 77 123 4567" })}
          {field("phone", "Phone number", { type: "tel" })}
          {field("email", "Email", { type: "email" })}
          {field("address", "Address")}
          {field("facebook", "Facebook page", { type: "url", placeholder: "https://www.facebook.com/…" })}
          {field("instagram", "Instagram profile", { type: "url", placeholder: "https://www.instagram.com/…" })}
        </div>
        <p className="mt-3 text-xs text-muted">Leave a field empty to hide it on the website.</p>
      </section>

      <section className="rounded-xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="mb-4 text-sm font-medium">Orders &amp; delivery</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("ecocashNumber", "EcoCash number", { inputMode: "tel", placeholder: "077 123 4567" })}
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm">Delivery days</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm has-[:checked]:border-brown has-[:checked]:bg-brown/5"
              >
                <input type="checkbox" name="deliveryDays" value={day} defaultChecked={values.deliveryDays.includes(day)} className="accent-brown" />
                {day}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6" {...a11y("hours")}>
          <legend className="mb-2 text-sm">Working hours</legend>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <label className="sr-only" htmlFor={`hours-days-${index}`}>Days, row {index + 1}</label>
                <input
                  id={`hours-days-${index}`}
                  name="hoursDays"
                  defaultValue={row.days}
                  placeholder="e.g. Monday & Tuesday"
                  className={cn(input(), "min-w-0 flex-[2_1_12rem]")}
                />
                <label className="sr-only" htmlFor={`hours-time-${index}`}>Hours, row {index + 1}</label>
                <input
                  id={`hours-time-${index}`}
                  name="hoursTime"
                  defaultValue={row.time}
                  placeholder="e.g. 08:00 – 17:00 or Closed"
                  className={cn(input(), "min-w-0 flex-[1_1_9rem]")}
                />
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-cream hover:text-danger"
                >
                  <X size={16} aria-hidden="true" />
                  <span className="sr-only">Remove row {index + 1}</span>
                </button>
              </div>
            ))}
          </div>
          {rows.length < MAX_HOURS_ROWS && (
            <button
              type="button"
              onClick={() => setRows((current) => [...current, { days: "", time: "" }])}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-charcoal hover:bg-cream"
            >
              <Plus size={14} aria-hidden="true" />
              Add a row
            </button>
          )}
          {err("hours")}
        </fieldset>
      </section>

      <button type="submit" disabled={pending} className={buttonClass()}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
