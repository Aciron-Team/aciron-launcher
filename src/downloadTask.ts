import { useSyncExternalStore } from "react";

let active = false;
const listeners = new Set<() => void>();

export function setDownloadActive(v: boolean) {
  if (active === v) return;
  active = v;
  listeners.forEach((l) => l());
}

export function useDownloadActive(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active,
    () => active
  );
}
