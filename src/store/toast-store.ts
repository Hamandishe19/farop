/** Minimal toast queue for short confirmations (e.g. "Added to cart"). */

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; href: string };
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: Toast[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

export const toastStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => toasts,
  getServerSnapshot: () => EMPTY,
  show(message: string, action?: Toast["action"], durationMs = 3500) {
    const toast = { id: nextId++, message, action };
    toasts = [...toasts.slice(-2), toast];
    emit();
    window.setTimeout(() => toastStore.dismiss(toast.id), durationMs);
  },
  dismiss(id: number) {
    toasts = toasts.filter((toast) => toast.id !== id);
    emit();
  },
};
