import { Share, SquarePlus } from "lucide-react";
import type { InstallPlatform } from "@/lib/pwa";

export function IOSInstallSteps() {
  return (
    <ol className="space-y-2 text-sm text-charcoal">
      <Step n={1}>Open this website in Safari.</Step>
      <Step n={2}>
        Tap the Share button
        <Share size={15} aria-label="(Share icon)" className="mx-1 inline -translate-y-px text-sage-deep" />.
      </Step>
      <Step n={3}>
        Select <strong className="font-medium">Add to Home Screen</strong>
        <SquarePlus size={15} aria-hidden="true" className="ml-1 inline -translate-y-px text-sage-deep" />.
      </Step>
      <Step n={4}>Confirm by tapping <strong className="font-medium">Add</strong>.</Step>
    </ol>
  );
}

/** Manual instructions for browsers without a native install prompt. */
export function ManualInstallSteps({ platform }: { platform: InstallPlatform }) {
  if (platform === "ios") return <IOSInstallSteps />;

  if (platform === "android") {
    return (
      <ol className="space-y-2 text-sm text-charcoal">
        <Step n={1}>Open your browser menu (usually ⋮ at the top right).</Step>
        <Step n={2}>
          Choose <strong className="font-medium">Install app</strong> or{" "}
          <strong className="font-medium">Add to Home screen</strong>.
        </Step>
        <Step n={3}>Confirm when asked.</Step>
      </ol>
    );
  }

  if (platform === "desktop") {
    return (
      <div className="space-y-2 text-sm text-charcoal">
        <p>
          In Chrome or Edge, look for the install icon at the right of the address bar, or open the browser
          menu and choose <strong className="font-medium">Install</strong>.
        </p>
        <p className="text-muted">
          Some browsers do not support installing websites. You can bookmark this page instead.
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted">
      Your browser may not support installing websites as apps. Look for an “Install” or “Add to Home
      Screen” option in its menu, or bookmark this page instead.
    </p>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-soft text-[0.7rem] font-semibold text-sage-deep"
      >
        {n}
      </span>
      <span>
        <span className="sr-only">Step {n}: </span>
        {children}
      </span>
    </li>
  );
}
