import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Clock, Mail, MapPin, Phone, Truck } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { SocialLinks, whatsAppChatUrl } from "@/components/contact/social-links";
import { WhatsAppIcon } from "@/components/icons/social-icons";
import { Container } from "@/components/layout/container";
import { buttonClass } from "@/components/ui/button-styles";
import { siteConfig } from "@/config/site";
import { buildFaqs } from "@/data/faqs";
import { formatList } from "@/lib/format";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Contact & FAQs",
  description: `Get in touch with ${siteConfig.name} about products, sizes and orders.`,
};

export default async function ContactPage() {
  const settings = await getSettings();
  const { email, phone, address, hours, deliveryDays } = settings;
  const faqs = buildFaqs(settings, siteConfig.currency);
  const details = [
    email && { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
    phone && { icon: Phone, label: "Phone", value: phone, href: `tel:${phone.replace(/[^+\d]/g, "")}` },
    address && { icon: MapPin, label: "Address", value: address },
    deliveryDays.length > 0 && { icon: Truck, label: "Deliveries", value: `Every ${formatList(deliveryDays)}` },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; value: ReactNode; href?: string }>;
  if (hours.length > 0) {
    details.push({
      icon: Clock,
      label: "Working hours",
      value: (
        <table className="mt-1 text-sm">
          <tbody>
            {hours.map((row) => (
              <tr key={row.days}>
                <th scope="row" className="py-0.5 pr-4 text-left font-normal text-muted">{row.days}</th>
                <td className="py-0.5 tabular-nums">{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    });
  }
  const whatsappUrl = whatsAppChatUrl(settings.whatsapp);
  const hasSocial = Boolean(settings.facebook || settings.whatsapp);

  return (
    <>
      <section className="border-b border-line bg-cream/50">
        <Container className="py-12 sm:py-16">
          <p className="eyebrow mb-3">Contact</p>
          <h1 className="max-w-2xl font-display text-4xl tracking-tight text-charcoal sm:text-5xl">
            We&apos;d love to hear from you.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Questions about a product, sizing or an order? Get in touch and we&apos;ll be glad to help.
          </p>
        </Container>
      </section>

      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <div className="space-y-10">
          <section aria-labelledby="channels-heading">
            <h2 id="channels-heading" className="font-display text-2xl text-charcoal">
              Talk to us
            </h2>
            {whatsappUrl ? (
              <div className="mt-5">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: "whatsapp", size: "lg" })}>
                  <WhatsAppIcon size={18} />
                  Chat on WhatsApp
                </a>
                <p className="mt-2 text-xs text-muted">Opens WhatsApp in a new tab or the app on your phone.</p>
              </div>
            ) : null}

            {hasSocial ? (
              <SocialLinks settings={settings} variant="list" className="mt-6" />
            ) : (
              <p className="mt-4 rounded-lg bg-cream px-4 py-3.5 text-sm leading-relaxed text-muted">
                Our WhatsApp and Facebook details are being finalised and will appear here soon.
              </p>
            )}

            {details.length > 0 && (
              <dl className="mt-8 space-y-4">
                {details.map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex gap-3">
                    <Icon size={18} aria-hidden="true" className="mt-0.5 text-sage-deep" />
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
                      <dd className="text-sm text-charcoal">
                        {href ? <a href={href} className="hover:underline">{value}</a> : value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="font-display text-2xl text-charcoal">
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[0.95rem] font-medium text-charcoal [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="relative h-3 w-3 shrink-0 before:absolute before:left-0 before:top-1/2 before:h-px before:w-3 before:bg-current after:absolute after:left-1/2 after:top-0 after:h-3 after:w-px after:bg-current after:transition-transform group-open:after:scale-y-0"
                    />
                  </summary>
                  <p className="pb-5 pr-6 text-sm leading-relaxed text-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <section aria-labelledby="form-heading" className="rounded-2xl border border-line bg-white/50 p-6 sm:p-8 lg:self-start">
          <h2 id="form-heading" className="font-display text-2xl text-charcoal">
            Send an enquiry
          </h2>
          <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
            Fill in the form and your enquiry opens in WhatsApp, ready to send. We&apos;ll reply to you there.
          </p>
          <ContactForm whatsappNumber={settings.whatsapp} />
        </section>
      </Container>
    </>
  );
}
