"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ManualInstallSteps } from "@/components/pwa/install-steps";
import { buttonClass } from "@/components/ui/button-styles";
import { useInstall } from "@/hooks/use-install";
import {
  canInstallManually,
  checkInstalledRelatedApp,
  detectPlatform,
  isStandalone,
  rememberDismissal,
  rememberInstalled,
  supportsNativePrompt,
  wasInstalledHere,
  wasRecentlyDismissed,
  type InstallPlatform,
} from "@/lib/pwa";
import { toastStore } from "@/store/toast-store";

/** Visitors browse briefly before we suggest installing. */
const ENGAGEMENT_DELAY_MS = 8_000;
/** Pages where a floating panel could get in the way of the main task. */
const SUPPRESSED_PATHS = ["/cart", "/contact"];

type Mode = "native" | "manual";

/**
 * Small, dismissible install suggestion, never shown inside the installed app.
 *
 * - Chromium browsers: once the browser offers `beforeinstallprompt`, "Install App"
 *   opens its own install dialog. If it never does, manual steps are offered only
 *   when `getInstalledRelatedApps` confirms the app is not already installed
 *   (Chromium withholds the event for installed apps).
 * - Safari (iOS and Mac), Firefox on Android and others: no native prompt, so we
 *   show platform-specific Add to Home Screen / Add to Dock steps.
 * - Desktop Firefox: nothing is shown, as it cannot install websites.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const { canPromptNatively, installed, promptInstall } = useInstall();
  const [eligible, setEligible] = useState(false);
  const [manualEligible, setManualEligible] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("unknown");
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [busy, setBusy] = useState(false);

  // Decide eligibility once on the client, after an engagement delay.
  useEffect(() => {
    if (isStandalone() || wasInstalledHere() || wasRecentlyDismissed()) return;
    let cancelled = false;
    let timer: number | undefined;

    checkInstalledRelatedApp().then((related) => {
      if (cancelled) return;
      if (related === "installed") {
        rememberInstalled();
        return;
      }
      timer = window.setTimeout(() => {
        setEligible(true);
        setPlatform(detectPlatform());
        // Chromium without its own prompt may mean "already installed"; only fall
        // back to manual steps when that has been ruled out.
        setManualEligible(canInstallManually() && (!supportsNativePrompt() || related === "not-installed"));
      }, ENGAGEMENT_DELAY_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const mode: Mode | null = canPromptNatively ? "native" : manualEligible ? "manual" : null;
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

      {mode === "manual" && showSteps && (
        <div className="mt-4 rounded-lg bg-white/70 p-3.5">
          <p className="mb-2.5 text-sm font-medium text-charcoal">
            {platform === "desktop" ? "Install this website as an app:" : "Add this website to your Home Screen:"}
          </p>
          <ManualInstallSteps platform={platform} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {/* Only Chromium lets a site install itself; elsewhere "Install App" reveals the browser's steps. */}
        {!(mode === "manual" && showSteps) && (
          <button
            type="button"
            onClick={mode === "native" ? install : () => setShowSteps(true)}
            disabled={busy}
            className={buttonClass({ size: "sm", className: "flex-1" })}
          >
            {busy ? "Opening…" : "Install App"}
          </button>
        )}
        <button type="button" onClick={notNow} className={buttonClass({ variant: "secondary", size: "sm", className: "flex-1" })}>
          {mode === "manual" && showSteps ? "Done" : "Ignore"}
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
