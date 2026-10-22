/**
 * Browser-only PWA helpers. Call these from effects or event handlers,
 * never during render, so server and client markup stay identical.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const modes = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"];
  const viaMedia = modes.some((mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches);
  const viaIOS = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return viaMedia || viaIOS;
}

export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; touch support distinguishes it.
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIPadOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "unknown";
}

/** On iOS, Add to Home Screen is reliably available from Safari's Share menu. */
export function isIOSSafari(): boolean {
  if (detectPlatform() !== "ios") return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent);
}

const DISMISSED_KEY = "farop.install.dismissedAt";
const INSTALLED_KEY = "farop.install.installed";
export const INSTALL_PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable; the prompt simply may reappear next visit.
  }
}

export function wasRecentlyDismissed(now = Date.now()): boolean {
  const value = Number(readStorage(DISMISSED_KEY));
  return Number.isFinite(value) && value > 0 && now - value < INSTALL_PROMPT_COOLDOWN_MS;
}

export function rememberDismissal() {
  writeStorage(DISMISSED_KEY, String(Date.now()));
}

export function rememberInstalled() {
  writeStorage(INSTALLED_KEY, "1");
}

export function wasInstalledHere(): boolean {
  return readStorage(INSTALLED_KEY) === "1";
}
