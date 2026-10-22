import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { images } from "@/config/images";
import { siteConfig } from "@/config/site";

/** Shared layout for the admin sign-in, forgot-password and new-password screens. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main id="main" className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-cream lg:block">
        <Image src={images.heroRack.src} alt="" fill sizes="50vw" loading="eager" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-ivory">
          <p className="font-display text-4xl leading-tight">{siteConfig.name}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ivory/85">
            Manage products, prices, photos and business details for the shop.
          </p>
        </div>
      </div>

      <div className="flex flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl text-charcoal">
            {siteConfig.shortName} <span className="font-sans text-sm text-muted">Admin</span>
          </p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-charcoal">
            <ArrowLeft size={13} aria-hidden="true" />
            Back to the shop
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-3xl tracking-tight text-charcoal">{title}</h1>
            {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <ShieldCheck size={13} aria-hidden="true" />
          For authorised administrators only. Sign-in attempts are rate-limited.
        </p>
      </div>
    </main>
  );
}

/** Coloured notice used on the auth screens. */
export function AuthNotice({ tone, children }: { tone: "info" | "success" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "bg-cream text-charcoal",
    success: "bg-sage-soft text-charcoal",
    error: "bg-blush-soft text-charcoal",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mb-5 rounded-lg px-3.5 py-3 text-sm leading-relaxed ${styles[tone]}`}>
      {children}
    </p>
  );
}
