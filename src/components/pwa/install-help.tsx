"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { ManualInstallSteps } from "@/components/pwa/install-steps";
import { buttonClass } from "@/components/ui/button-styles";
import { useInstall } from "@/hooks/use-install";
import { detectPlatform, isStandalone, type InstallPlatform } from "@/lib/pwa";

/**
 * Footer link opening general install guidance. Works on every platform:
 * offers the native prompt when available, otherwise manual steps.
 */
export function InstallHelpButton({ className }: { className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { canPromptNatively, installed, promptInstall } = useInstall();
  const [platform, setPlatform] = useState<InstallPlatform>("unknown");
  const [standalone, setStandalone] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function open() {
    setPlatform(detectPlatform());
    setStandalone(isStandalone());
    setResult(null);
    dialogRef.current?.showModal();
  }

  async function install() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setResult("Your browser is installing the app.");
    } else if (outcome === "dismissed") {
      setResult("No problem — you can install later from this link.");
    } else {
      setResult("Installation isn't available from this browser right now.");
    }
  }

  return (
    <>
      <button type="button" onClick={open} className={className}>
        Install the app
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="install-help-title"
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        className="glass m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl p-0 text-charcoal backdrop:bg-charcoal/25 open:animate-rise"
      >
        <div className="relative p-6">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-white/70"
          >
            <X size={16} aria-hidden="true" />
          </button>
          <h2 id="install-help-title" className="font-display text-xl">
            Install the app
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-muted">
            Add this site to your device for quicker access to the collection and your cart.
          </p>

          {standalone || installed ? (
            <p className="text-sm">You&apos;re already using the installed app.</p>
          ) : canPromptNatively ? (
            <button type="button" onClick={install} className={buttonClass({ block: true })}>
              Install App
            </button>
          ) : (
            <ManualInstallSteps platform={platform} />
          )}

          {result && (
            <p role="status" className="mt-4 text-sm text-sage-deep">
              {result}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
