import { useSyncExternalStore } from "react";

export type DlTask = {
  id: string;
  name: string;

  current: number;
  total: number;
  message: string;

  done?: boolean;

  blocking?: boolean;

  cancelled?: boolean;
};

let tasks: DlTask[] = [];
const listeners = new Set<() => void>();

function emit() {
  tasks = [...tasks];
  listeners.forEach((l) => l());
}

export function startTask(id: string, name: string, blocking = false) {
  const t = tasks.find((x) => x.id === id);
  if (t) {
    t.name = name;
    t.done = false;
  } else {
    tasks.push({ id, name, current: 0, total: 0, message: "Подготовка…", blocking });
  }
  emit();
}

export function updateTask(id: string, patch: Partial<Omit<DlTask, "id">>) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  emit();
}

export function endTask(id: string, ok = true) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;

  if (t.cancelled) return;
  if (!ok) {
    tasks = tasks.filter((x) => x.id !== id);
    emit();
    return;
  }
  t.done = true;
  t.message = "Готово";
  emit();
  setTimeout(() => {
    tasks = tasks.filter((x) => x.id !== id);
    emit();
  }, 1400);
}

export function cancelTask(id: string) {
  const t = tasks.find((x) => x.id === id);
  if (!t || t.done) return;

  void import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("cancel_download", { id }))
    .catch(() => {});
  t.cancelled = true;
  t.done = true;
  t.message = "Отменено";
  cancelledIds.add(id);
  setTimeout(() => cancelledIds.delete(id), 60_000);
  emit();
  setTimeout(() => {
    tasks = tasks.filter((x) => x.id !== id);
    emit();
  }, 1200);
}

export function wasCancelled(id: string): boolean {
  const t = tasks.find((x) => x.id === id);
  return t ? !!t.cancelled : cancelledIds.has(id);
}

const cancelledIds = new Set<string>();

export function useTasks(): DlTask[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => tasks,
    () => tasks
  );
}

export function useDownloadActive(): boolean {
  return useTasks().some((t) => !t.done && t.blocking);
}

const LEGACY_ID = "legacy";

if (typeof window !== "undefined") {
  window.addEventListener("aciron-task-start", (e) => {
    startTask(LEGACY_ID, (e as CustomEvent).detail?.name ?? "Загрузка", true);
  });
  window.addEventListener("aciron-task-end", () => {

    endTask(LEGACY_ID, false);
  });
}

export function legacyProgress(stage: string, message: string, current: number, total: number) {
  if (!tasks.some((t) => t.id === LEGACY_ID)) return;
  if (stage === "modpack") updateTask(LEGACY_ID, { current, total, message });
  else if (stage === "done") endTask(LEGACY_ID, true);
  else if (stage === "error") endTask(LEGACY_ID, false);
}
