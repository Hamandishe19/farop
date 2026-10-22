import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { buttonClass } from "@/components/ui/button-styles";
import { images } from "@/config/images";
import { categoryLinks } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${siteConfig.name}: baby clothing, baby shoes and babywear essentials.`,
};

/**
 * Brand values are intentionally not listed until the business supplies them.
 * Add them here, e.g. [{ title: "...", text: "..." }], and the section appears.
 */
const brandValues: Array<{ title: string; text: string }> = [];

const service = [
  {
    title: "Personal replies",
    text: "Every order is handled personally. We confirm availability and your delivery day before anything is finalised.",
  },
  {
    title: "Help with sizing",
    text: "Not sure which size to choose? Ask us about any piece and we'll help you decide.",
  },
  {
    title: "No account needed",
    text: "Browse, build a cart and send it to us on WhatsApp. There's nothing to sign up for.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section>
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:py-20">
          <div className="max-w-xl">
            <p className="eyebrow mb-4">About us</p>
            <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-charcoal sm:text-5xl">
              Clothing and shoes for life&apos;s earliest chapters.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              {siteConfig.name} offers a range of baby clothing, baby shoes and related babywear. We bring
              together everyday basics, pieces for special occasions and first shoes in one simple
              catalogue.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Ordering is simple: choose the pieces you like, send us your order on WhatsApp, and pay cash
              on delivery or by EcoCash once we&apos;ve confirmed it with you.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-cream">
            <Image
              src={images.aboutShelves.src}
              alt={images.aboutShelves.alt}
              fill
              loading="eager"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-cream/50">
        <Container className="py-14 sm:py-16">
          <p className="eyebrow mb-3">What we offer</p>
          <h2 className="font-display text-3xl tracking-tight text-charcoal">Our products</h2>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {categoryLinks.map((link) => (
              <li key={link.href} className="bg-ivory">
                <Link href={link.href} className="group flex items-center justify-between gap-4 p-6 transition-colors hover:bg-white">
                  <span>
                    <span className="block font-display text-xl text-charcoal">{link.label}</span>
                    <span className="mt-0.5 block text-sm text-muted">{link.hint}</span>
                  </span>
                  <ArrowRight size={18} aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section>
        <Container className="py-14 sm:py-20">
          <div className="max-w-xl">
            <p className="eyebrow mb-3">Customer service</p>
            <h2 className="font-display text-3xl tracking-tight text-charcoal">How we look after you</h2>
          </div>
          <ul className="mt-10 grid gap-10 sm:grid-cols-3">
            {service.map((item) => (
              <li key={item.title} className="border-t border-line pt-5">
                <h3 className="text-base font-medium text-charcoal">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>

          {brandValues.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-3xl tracking-tight text-charcoal">Our values</h2>
              <ul className="mt-8 grid gap-10 sm:grid-cols-3">
                {brandValues.map((value) => (
                  <li key={value.title} className="border-t border-line pt-5">
                    <h3 className="text-base font-medium text-charcoal">{value.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{value.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-16 flex flex-wrap gap-3">
            <Link href="/#categories" className={buttonClass({ size: "lg" })}>
              Explore the collection
            </Link>
            <Link href="/contact" className={buttonClass({ variant: "secondary", size: "lg" })}>
              Contact us
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
