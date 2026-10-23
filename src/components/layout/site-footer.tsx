import Link from "next/link";
import { cacheLife } from "next/cache";
import { BrandMark } from "@/components/layout/brand-mark";
import { Container } from "@/components/layout/container";
import { SocialLinks } from "@/components/contact/social-links";
import { InstallHelpButton } from "@/components/pwa/install-help";
import { categoryLinks } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { formatList } from "@/lib/format";
import { getSettings } from "@/services/settings";

async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function SiteFooter() {
  const settings = await getSettings();
  const hasChannels = Boolean(settings.whatsapp || settings.facebook);

  return (
    <footer className="mt-24 border-t border-line bg-cream/60">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 max-w-xs lg:col-span-1">
          <BrandMark />
          <p className="mt-4 text-sm leading-relaxed text-muted">{siteConfig.description}</p>
        </div>

        <nav aria-label="Footer — shop">
          <h2 className="eyebrow mb-4">Shop</h2>
          <ul className="space-y-2.5 text-sm">
            {categoryLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-charcoal/80 hover:text-charcoal">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer — company">
          <h2 className="eyebrow mb-4">Company</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/" className="text-charcoal/80 hover:text-charcoal">Home</Link></li>
            <li><Link href="/about" className="text-charcoal/80 hover:text-charcoal">About</Link></li>
            <li><Link href="/contact" className="text-charcoal/80 hover:text-charcoal">Contact &amp; FAQs</Link></li>
            <li><Link href="/cart" className="text-charcoal/80 hover:text-charcoal">Your cart</Link></li>
            <li><InstallHelpButton className="text-charcoal/80 hover:text-charcoal" /></li>
          </ul>
        </nav>

        <div className="col-span-2 max-w-sm lg:col-span-1">
          <h2 className="eyebrow mb-4">Get in touch</h2>
          {hasChannels ? (
            <SocialLinks settings={settings} />
          ) : (
            <p className="text-sm leading-relaxed text-muted">
              Our WhatsApp and social pages will be listed here soon. In the meantime, visit the{" "}
              <Link href="/contact" className="underline underline-offset-4 hover:text-charcoal">
                contact page
              </Link>
              .
            </p>
          )}
          {settings.deliveryDays.length > 0 && (
            <p className="mt-4 text-sm text-charcoal/80">
              Deliveries every {formatList(settings.deliveryDays)}.
            </p>
          )}
          {settings.hours.length > 0 && (
            <dl className="mt-3 space-y-1 text-xs text-muted">
              {settings.hours.map((row) => (
                <div key={row.days} className="flex justify-between gap-4">
                  <dt>{row.days}</dt>
                  <dd className="tabular-nums">{row.time}</dd>
                </div>
              ))}
            </dl>
          )}
          {settings.email && (
            <p className="mt-4 text-sm">
              <a href={`mailto:${settings.email}`} className="text-charcoal/80 hover:text-charcoal">
                {settings.email}
              </a>
            </p>
          )}
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.name}. All rights reserved.
          </p>
          <p>Product photography shown is illustrative.</p>
        </Container>
      </div>
    </footer>
  );
}
