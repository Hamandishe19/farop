import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShoppingBag, Shirt } from "lucide-react";
import { Container, SectionHeading } from "@/components/layout/container";
import { CataloguePreviews } from "@/components/product/catalogue-previews";
import { DemoNotice } from "@/components/product/demo-notice";
import { EmptyCatalogue } from "@/components/product/product-grid";
import { ProductImage } from "@/components/product/product-image";
import { buttonClass } from "@/components/ui/button-styles";
import { images } from "@/config/images";
import { siteConfig } from "@/config/site";
import { getCategories } from "@/services/categories";
import { getActiveProducts } from "@/services/products";

const steps = [
  {
    icon: Shirt,
    title: "Browse the collection",
    text: "Explore baby clothing, shoes and essentials by category.",
  },
  {
    icon: ShoppingBag,
    title: "Build your cart",
    text: "Add the pieces you like and choose sizes where they apply.",
  },
  {
    icon: MessageCircle,
    title: "Place your order",
    text: "Add your delivery address, choose Cash on delivery or EcoCash, and send your order on WhatsApp.",
  },
];

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getActiveProducts()]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
          <div className="max-w-xl">
            <p className="eyebrow mb-5">Baby clothing · Shoes · Essentials</p>
            <h1 className="font-display text-[2.6rem] leading-[1.05] tracking-tight text-charcoal sm:text-6xl">
              Soft beginnings, thoughtfully chosen.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              Everyday babywear, first shoes and essentials for the littlest members of the family.
              Choose what you love and order directly on WhatsApp.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="#categories" className={buttonClass({ size: "lg" })}>
                Explore Collection
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/contact" className={buttonClass({ variant: "secondary", size: "lg" })}>
                Contact Us
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-cream sm:aspect-[16/9] lg:aspect-[5/4]">
              <Image
                src={images.heroRack.src}
                alt={images.heroRack.alt}
                fill
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="glass absolute -bottom-5 left-4 right-4 rounded-xl px-5 py-4 sm:left-auto sm:right-6 sm:w-72">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage-deep">How it works</p>
              <p className="mt-1.5 text-sm leading-relaxed text-charcoal">
                Add pieces to your cart, then place your order on WhatsApp. Pay cash on delivery or by EcoCash.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section id="categories" className="scroll-mt-20 pt-16 sm:pt-20">
        <Container>
          <SectionHeading
            eyebrow="Collections"
            title="Shop by category"
            description="Four collections, from newborn basics to first shoes."
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-6 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link href={`/${category.slug}`} className="group block">
                  <ProductImage
                    image={category.image}
                    hoverZoom
                    ratio="aspect-[4/3]"
                    className="rounded-lg"
                    sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 50vw"
                  />
                  <div className="mt-3 flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base leading-snug text-charcoal min-[360px]:text-lg min-[400px]:text-xl lg:text-2xl">{category.name}</h3>
                      <p className="mt-0.5 text-sm text-muted">{category.summary}</p>
                    </div>
                    <ArrowRight
                      size={18}
                      aria-hidden="true"
                      className="mt-1.5 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-charcoal"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Catalogue previews */}
      <section className="pt-20 sm:pt-28">
        <Container>
          <SectionHeading
            eyebrow="Catalogues"
            title="Explore each catalogue"
            description="A first look at every collection. Open a catalogue to see all of its pieces."
          />
          {products.length === 0 ? (
            <EmptyCatalogue message="Our first pieces are being added. Browse the collections, or contact us to ask about something specific." />
          ) : (
            <>
              <div className="mb-10">
                <DemoNotice />
              </div>
              <CataloguePreviews categories={categories} products={products} />
            </>
          )}
        </Container>
      </section>

      {/* How ordering works */}
      <section className="pt-20 sm:pt-28">
        <Container>
          <div className="rounded-2xl bg-cream px-6 py-12 sm:px-12 sm:py-14">
            <div className="max-w-xl">
              <p className="eyebrow mb-3">Ordering</p>
              <h2 className="font-display text-3xl tracking-tight text-charcoal sm:text-[2.35rem]">
                Simple ordering, personal service
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Send us your order on WhatsApp and we&apos;ll confirm availability and your delivery day. Pay
                cash on delivery, or by EcoCash once we&apos;ve confirmed your order.
              </p>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory text-sage-deep">
                    <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-xs font-semibold text-muted">Step {index + 1}</p>
                  <h3 className="mt-1 text-base font-medium text-charcoal">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* About */}
      <section className="pt-20 sm:pt-28">
        <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-cream sm:aspect-[16/9] lg:aspect-[4/5]">
            <Image
              src={images.aboutShelves.src}
              alt={images.aboutShelves.alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="max-w-lg">
            <p className="eyebrow mb-3">About us</p>
            <h2 className="font-display text-3xl tracking-tight text-charcoal sm:text-[2.35rem]">
              Babywear for everyday moments
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              {siteConfig.name} offers baby clothing, baby shoes and related babywear for boys and girls,
              from everyday basics to pieces for special occasions.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted">
              We keep things personal: tell us what you&apos;re looking for and we&apos;ll help with sizes,
              availability and your order.
            </p>
            <Link href="/about" className={buttonClass({ variant: "secondary", className: "mt-8" })}>
              More about us
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Contact */}
      <section className="pt-20 sm:pt-28">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 border-y border-line py-12 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-3xl tracking-tight text-charcoal">Have a question?</h2>
              <p className="mt-2 text-base text-muted">
                Ask about sizes, availability or a specific piece. We&apos;re happy to help.
              </p>
            </div>
            <Link href="/contact" className={buttonClass({ size: "lg" })}>
              Get in touch
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
