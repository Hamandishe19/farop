import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Temporary text wordmark. Replace with the official logo (e.g. an
 * <Image src="/brand/logo.svg" />) once the business supplies it.
 */
export function BrandMark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-baseline gap-1.5 text-charcoal", className)}
      aria-label={`${siteConfig.name} — home`}
    >
      <span className="font-display text-[1.45rem] leading-none tracking-tight">{siteConfig.shortName}</span>
      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-sage-deep">
        Babywear
      </span>
    </Link>
  );
}
