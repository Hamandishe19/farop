"use client";

import { useSyncExternalStore } from "react";
import { installStore } from "@/store/install-store";

export function useInstall() {
  const state = useSyncExternalStore(
    installStore.subscribe,
    installStore.getSnapshot,
    installStore.getServerSnapshot,
  );
  return {
    canPromptNatively: state.deferred !== null,
    installed: state.installed,
    promptInstall: installStore.promptInstall,
  };
}
