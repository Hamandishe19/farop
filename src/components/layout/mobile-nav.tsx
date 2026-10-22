"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import { categoryLinks, primaryLinks } from "@/config/navigation";
import { BrandMark } from "@/components/layout/brand-mark";

/**
 * Mobile navigation drawer built on the native <dialog> element, which
 * provides focus containment, Escape-to-close and an inert background.
 */
export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  // Close if the route changes while open (e.g. browser back).
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const linkClass =
    "flex items-center justify-between rounded-lg px-3 py-3 text-base text-charcoal transition-colors hover:bg-cream aria-[current=page]:bg-cream aria-[current=page]:font-medium";

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Open menu"
        aria-haspopup="dialog"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-charcoal hover:bg-cream md:hidden"
      >
        <Menu size={21} strokeWidth={1.6} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Site menu"
        onClick={(event) => {
          if (event.target === dialogRef.current) close(); // backdrop click
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(22rem,88vw)] max-w-none bg-ivory p-0 text-charcoal shadow-[var(--shadow-float)] backdrop:bg-charcoal/25 backdrop:backdrop-blur-[2px] open:animate-rise"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-line px-5">
            <BrandMark />
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream"
            >
              <X size={20} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-0.5">
              {primaryLinks.slice(0, 1).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className={linkClass} aria-current={pathname === link.href ? "page" : undefined}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="eyebrow mt-6 mb-2 px-3">Products</p>
            <ul className="space-y-0.5">
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className={linkClass} aria-current={pathname === link.href ? "page" : undefined}>
                    {link.label}
                    <span className="text-xs text-muted">{link.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="my-5 border-t border-line" />
            <ul className="space-y-0.5">
              {primaryLinks.slice(1).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} onClick={close} className={linkClass} aria-current={pathname === link.href ? "page" : undefined}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cart" onClick={close} className={linkClass} aria-current={pathname === "/cart" ? "page" : undefined}>
                  Cart
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
