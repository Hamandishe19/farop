/**
 * Captures the browser's `beforeinstallprompt` event (Chromium browsers) so
 * the install prompt and the footer help dialog can share it.
 *
 * Listeners are attached as soon as this module loads in the browser, so an
 * event fired early in the page lifecycle is not missed.
 */

import { rememberInstalled, type BeforeInstallPromptEvent } from "@/lib/pwa";

interface InstallState {
  /** Deferred native prompt; null when the browser has not offered one. */
  deferred: BeforeInstallPromptEvent | null;
  /** True only after the browser fires `appinstalled`. */
  installed: boolean;
}

let state: InstallState = { deferred: null, installed: false };
const SERVER_STATE: InstallState = { deferred: null, installed: false };
const listeners = new Set<() => void>();

function set(next: Partial<InstallState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // suppress the mini-infobar; we offer our own prompt
    set({ deferred: event as BeforeInstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => {
    rememberInstalled();
    set({ deferred: null, installed: true });
  });
}

export const installStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => state,
  getServerSnapshot: () => SERVER_STATE,

  /**
   * Show the native install dialog. Resolves with the user's choice, or
   * "unavailable" if the browser has not offered installation.
   */
  async promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
    const deferred = state.deferred;
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // A deferred prompt can only be used once.
      set({ deferred: null });
      return outcome;
    } catch {
      set({ deferred: null });
      return "unavailable";
    }
  },
};
