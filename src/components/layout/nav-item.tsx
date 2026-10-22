"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function NavItem({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-10 items-center rounded-full px-3.5 text-sm transition-colors hover:bg-cream",
        active ? "font-medium text-charcoal" : "text-charcoal/80",
      )}
    >
      {children}
    </Link>
  );
}
