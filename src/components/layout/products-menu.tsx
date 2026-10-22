"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { categoryLinks } from "@/config/navigation";
import { cn } from "@/lib/cn";

/** Desktop "Products" disclosure menu listing the categories. */
export function ProductsMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isActive = categoryLinks.some((link) => pathname === link.href);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-sm transition-colors hover:bg-cream",
          isActive ? "text-charcoal font-medium" : "text-charcoal/80",
        )}
      >
        Products
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn("transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="glass animate-rise absolute left-1/2 top-[calc(100%+10px)] w-[420px] -translate-x-1/2 rounded-xl p-2"
      >
        <ul className="grid grid-cols-2 gap-1">
          {categoryLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className="block rounded-lg px-3.5 py-2.5 transition-colors hover:bg-white/80 aria-[current=page]:bg-white/80"
              >
                <span className="block text-sm font-medium text-charcoal">{link.label}</span>
                <span className="block text-xs text-muted">{link.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
