"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className="border-b border-line bg-blush-soft">
      <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-sm text-charcoal sm:px-6 lg:px-8">
        <WifiOff size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brown" />
        <span>
          You&apos;re offline. Some pages may show saved information, so details may have changed. Placing an
          order needs a connection.
        </span>
      </p>
    </div>
  );
}
