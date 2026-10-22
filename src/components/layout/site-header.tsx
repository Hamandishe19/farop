import { BrandMark } from "@/components/layout/brand-mark";
import { CartLink } from "@/components/layout/cart-link";
import { Container } from "@/components/layout/container";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavItem } from "@/components/layout/nav-item";
import { ProductsMenu } from "@/components/layout/products-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/80 backdrop-blur-md supports-[backdrop-filter]:bg-ivory/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <BrandMark />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            <li>
              <NavItem href="/">Home</NavItem>
            </li>
            <li>
              <ProductsMenu />
            </li>
            <li>
              <NavItem href="/about">About</NavItem>
            </li>
            <li>
              <NavItem href="/contact">Contact</NavItem>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <CartLink />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
