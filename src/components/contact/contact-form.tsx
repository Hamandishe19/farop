"use client";

import { useId, useState, type SubmitEvent } from "react";
import { ChevronDown, WifiOff } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { buttonClass } from "@/components/ui/button-styles";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/cn";
import { ENQUIRY_CATEGORIES, validateEnquiry, type EnquiryErrors, type EnquiryInput } from "@/lib/validation/enquiry";
import { buildGeneralEnquiryMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Enquiry form that sends on WhatsApp. Opens WhatsApp with the enquiry
 * prefilled; the customer reviews and sends it themselves. Nothing is
 * stored or sent from the website.
 */
export function ContactForm({ whatsappNumber }: { whatsappNumber?: string }) {
  const online = useOnlineStatus();
  const id = useId();
  const [values, setValues] = useState<EnquiryInput>({ name: "", category: "", message: "" });
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [opened, setOpened] = useState(false);

  const url = buildWhatsAppUrl(
    whatsappNumber,
    buildGeneralEnquiryMessage({ name: values.name.trim(), category: values.category, message: values.message }),
  );

  function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateEnquiry(values);
    setErrors(next);
    if (Object.keys(next).length > 0 || !url || !online) return;

    const tab = window.open(url, "_blank");
    if (tab) tab.opener = null;
    else window.location.href = url;
    setOpened(true);
  }

  const update = (key: keyof EnquiryInput) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  const field = "w-full rounded-lg border bg-white/70 px-4 py-3 text-sm text-charcoal placeholder:text-muted/70 transition-colors focus:border-sage-deep";
  const errorText = (key: keyof EnquiryInput) =>
    errors[key] && (
      <p id={`${id}-${key}-error`} className="mt-1.5 text-xs text-danger">
        {errors[key]}
      </p>
    );
  const describedBy = (key: keyof EnquiryInput) => (errors[key] ? `${id}-${key}-error` : undefined);

  return (
    <form onSubmit={send} noValidate className="space-y-5" aria-describedby={`${id}-note`}>
      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input
          id={`${id}-name`}
          autoComplete="name"
          required
          maxLength={80}
          value={values.name}
          onChange={update("name")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className={cn(field, errors.name ? "border-danger/60" : "border-line")}
        />
        {errorText("name")}
      </div>

      <div>
        <label htmlFor={`${id}-category`} className="mb-1.5 block text-sm font-medium">
          What is your enquiry about?
        </label>
        <div className="relative">
          <select
            id={`${id}-category`}
            required
            value={values.category}
            onChange={update("category")}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy("category")}
            className={cn(field, "appearance-none pr-10", errors.category ? "border-danger/60" : "border-line")}
          >
            <option value="" disabled>
              Choose a topic
            </option>
            {ENQUIRY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
        </div>
        {errorText("category")}
      </div>

      <div>
        <label htmlFor={`${id}-message`} className="mb-1.5 block text-sm font-medium">
          Message
        </label>
        <textarea
          id={`${id}-message`}
          rows={5}
          required
          maxLength={2000}
          value={values.message}
          onChange={update("message")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describedBy("message")}
          className={cn(field, "resize-y", errors.message ? "border-danger/60" : "border-line")}
        />
        {errorText("message")}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={!url || !online}
          className={buttonClass({ variant: "whatsapp", size: "lg", className: !url || !online ? "opacity-50" : undefined })}
        >
          <WhatsAppIcon size={18} />
          Send on WhatsApp
        </button>
        <p id={`${id}-note`} className="text-xs leading-relaxed text-muted">
          Opens WhatsApp with your message ready. You can review it before sending.
        </p>
      </div>

      {!online ? (
        <p className="flex gap-2 text-sm text-muted">
          <WifiOff size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          You&apos;re offline. Reconnect to send your enquiry.
        </p>
      ) : opened ? (
        <p role="status" className="rounded-lg bg-sage-soft px-3.5 py-3 text-sm leading-relaxed text-charcoal">
          WhatsApp should now be open with your enquiry ready. Review it and tap send — it&apos;s only sent once you
          send it in WhatsApp.
        </p>
      ) : null}
    </form>
  );
}
