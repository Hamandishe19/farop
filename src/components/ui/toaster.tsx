"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Check, X } from "lucide-react";
import { toastStore } from "@/store/toast-store";

export function Toaster() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getServerSnapshot);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 top-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="glass animate-rise pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl py-3 pl-4 pr-2 text-sm text-charcoal"
        >
          <Check size={16} aria-hidden="true" className="shrink-0 text-sage-deep" />
          <p className="flex-1">{toast.message}</p>
          {toast.action && (
            <Link
              href={toast.action.href}
              onClick={() => toastStore.dismiss(toast.id)}
              className="rounded-full px-3 py-1.5 font-medium text-brown underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </Link>
          )}
          <button
            type="button"
            onClick={() => toastStore.dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-white/70"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
