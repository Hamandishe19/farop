import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { Container } from "@/components/layout/container";
import { siteConfig } from "@/config/site";
import { isValidPrice } from "@/lib/format";
import type { CatalogueFacts } from "@/lib/cart";
import { getActiveProducts } from "@/services/products";
import { getSettings } from "@/services/settings";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your selection and place your order via WhatsApp.",
  robots: { index: false },
};

export default async function CartPage() {
  // Current catalogue facts, used to refresh and validate what's stored in the browser.
  const [products, settings] = await Promise.all([getActiveProducts(), getSettings()]);
  const catalogue: CatalogueFacts[] = products
    .filter((product) => product.availability !== "out_of_stock")
    .map((product) => {
      const priced = isValidPrice(product.price, product.currency);
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        imageSrc: product.image?.src,
        imageAlt: product.image?.alt,
        sizes: product.sizes?.length ? product.sizes : undefined,
        price: priced ? product.price : undefined,
        currency: priced ? product.currency : undefined,
      };
    });

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="font-display text-4xl tracking-tight text-charcoal sm:text-5xl">Your cart</h1>
      <p className="mt-3 max-w-xl text-base text-muted">
        Review your selection, add your delivery details and choose Cash on delivery or EcoCash. Your order is sent
        to us on WhatsApp.
      </p>
      <div className="mt-10">
        <CartView
          catalogue={catalogue}
          businessName={siteConfig.name}
          orderSettings={{
            whatsapp: settings.whatsapp,
            ecocashNumber: settings.ecocashNumber,
            deliveryDays: settings.deliveryDays,
          }}
        />
      </div>
    </Container>
  );
}
