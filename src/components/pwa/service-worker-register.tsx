"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds. Skipped in development so cached
 * assets never mask code changes while working locally.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Registration failure only disables offline support; the site still works.
      });
  }, []);
  return null;
}
