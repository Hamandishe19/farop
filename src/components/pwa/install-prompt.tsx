"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IOSInstallSteps } from "@/components/pwa/install-steps";
import { buttonClass } from "@/components/ui/button-styles";
import { useInstall } from "@/hooks/use-install";
import { isIOSSafari, isStandalone, rememberDismissal, wasInstalledHere, wasRecentlyDismissed } from "@/lib/pwa";
import { toastStore } from "@/store/toast-store";

/** Visitors browse for a while before we suggest installing. */
const ENGAGEMENT_DELAY_MS = 25_000;
/** Pages where a floating panel could get in the way of the main task. */
const SUPPRESSED_PATHS = ["/cart", "/contact"];

type Mode = "native" | "ios";

/**
 * Small, dismissible install suggestion.
 *
 * - Chromium browsers: shown only after the browser offers `beforeinstallprompt`;
 *   "Install App" opens the browser's own install dialog.
 * - iOS Safari: there is no native prompt, so we show Add to Home Screen steps.
 * - Everything else: nothing is shown (no non-functional install button). The
 *   footer's "Install the app" link offers general guidance instead.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const { canPromptNatively, installed, promptInstall } = useInstall();
  const [eligible, setEligible] = useState(false);
  const [iosEligible, setIosEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);

  // Decide eligibility once on the client, after an engagement delay.
  useEffect(() => {
    if (isStandalone() || wasInstalledHere() || wasRecentlyDismissed()) return;
    const timer = window.setTimeout(() => {
      setEligible(true);
      setIosEligible(isIOSSafari());
    }, ENGAGEMENT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const mode: Mode | null = canPromptNatively ? "native" : iosEligible ? "ios" : null;
  const visible =
    eligible && !dismissed && !installed && mode !== null && !SUPPRESSED_PATHS.includes(pathname);

  if (!visible) return null;

  function notNow() {
    rememberDismissal();
    setDismissed(true);
  }

  async function install() {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") {
      // Installation is confirmed separately by the `appinstalled` event.
      setDismissed(true);
    } else {
      // Declined in the browser dialog: respect it and apply the cooldown.
      notNow();
    }
  }

  return (
    <aside
      aria-labelledby="install-prompt-title"
      className="glass animate-rise fixed inset-x-4 bottom-4 z-50 rounded-xl p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]"
    >
      <button
        type="button"
        onClick={notNow}
        aria-label="Dismiss install suggestion"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-white/70 hover:text-charcoal"
      >
        <X size={16} aria-hidden="true" />
      </button>

      <div className="flex gap-3 pr-6">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-lg border border-line"
        />
        <div>
          <p id="install-prompt-title" className="font-display text-[1.05rem] leading-snug text-charcoal">
            Enjoy easier access to our babywear collection.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Install our app to browse products and place orders more conveniently.
          </p>
        </div>
      </div>

      {mode === "ios" && showSteps && (
        <div className="mt-4 rounded-lg bg-white/70 p-3.5">
          <p className="mb-2.5 text-sm font-medium text-charcoal">Add this website to your Home Screen:</p>
          <IOSInstallSteps />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {mode === "native" ? (
          <button type="button" onClick={install} disabled={busy} className={buttonClass({ size: "sm", className: "flex-1" })}>
            {busy ? "Opening…" : "Install App"}
          </button>
        ) : (
          !showSteps && (
            <button
              type="button"
              onClick={() => setShowSteps(true)}
              className={buttonClass({ size: "sm", className: "flex-1" })}
            >
              Show Me How
            </button>
          )
        )}
        <button type="button" onClick={notNow} className={buttonClass({ variant: "secondary", size: "sm", className: "flex-1" })}>
          {mode === "ios" && showSteps ? "Done" : "Not Now"}
        </button>
      </div>
    </aside>
  );
}

/** Announces a confirmed installation (fired by the browser, not assumed). */
export function InstalledNotice() {
  const { installed } = useInstall();
  useEffect(() => {
    if (installed) toastStore.show("App installed. You can open it from your home screen or app list.");
  }, [installed]);
  return null;
}
