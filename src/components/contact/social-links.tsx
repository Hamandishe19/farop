import { FacebookIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { BusinessSettings } from "@/types/settings";

export function whatsAppChatUrl(whatsapp: string | undefined, message = "Hello! I have a question about your babywear.") {
  return buildWhatsAppUrl(whatsapp, message);
}

/** Renders the configured channels. Returns null if none are. */
export function SocialLinks({
  settings,
  className,
  variant = "icon",
}: {
  settings: BusinessSettings;
  className?: string;
  variant?: "icon" | "list";
}) {
  const items = [
    settings.whatsapp && {
      label: "WhatsApp",
      href: whatsAppChatUrl(settings.whatsapp),
      Icon: WhatsAppIcon,
      description: "Chat with us",
    },
    settings.facebook && {
      label: "Facebook",
      href: settings.facebook,
      Icon: FacebookIcon,
      description: "Visit our page",
    },
  ].filter(Boolean) as Array<{ label: string; href: string; Icon: typeof WhatsAppIcon; description: string }>;

  if (items.length === 0) return null;

  if (variant === "list") {
    return (
      <ul className={cn("space-y-2", className)}>
        {items.map(({ label, href, Icon, description }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-line bg-white/60 px-4 py-3 transition-colors hover:border-brown/30 hover:bg-white"
            >
              <Icon size={20} className="text-sage-deep" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-charcoal">{label}</span>
                <span className="block text-xs text-muted">{description}</span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("flex items-center gap-2", className)}>
      {items.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${siteConfig.name} on ${label} (opens in a new tab)`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-charcoal transition-colors hover:border-brown/40 hover:bg-white"
          >
            <Icon size={18} />
          </a>
        </li>
      ))}
    </ul>
  );
}
