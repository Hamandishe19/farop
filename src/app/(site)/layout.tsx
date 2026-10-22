import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { InstallPrompt, InstalledNotice } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { Toaster } from "@/components/ui/toaster";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-charcoal focus:px-4 focus:py-2 focus:text-sm focus:text-ivory"
      >
        Skip to content
      </a>
      <SiteHeader />
      <OfflineBanner />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Toaster />
      <InstallPrompt />
      <InstalledNotice />
    </>
  );
}
