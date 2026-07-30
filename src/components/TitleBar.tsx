import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { APP_VERSION, APP_CHANNEL } from "../config";
import { getSettings, isTauri } from "../api";
import { useMaximized } from "../windowState";

const appWindow = (() => {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
})();

type UpState = "idle" | "downloading" | "installing";

export default function TitleBar() {

  const [update, setUpdate] = useState<any>(null);
  const [state, setState] = useState<UpState>("idle");
  const [pct, setPct] = useState(0);

  const maximized = useMaximized();

  const toggleMaximize = () => appWindow?.toggleMaximize().catch(() => {});

  useEffect(() => {
    if (!isTauri) return;
    let alive = true;
    (async () => {
      try {
        const s = await getSettings();
        if (!alive || !s.auto_update_check) return;
        const { check } = await import("@tauri-apps/plugin-updater");
        const upd = await check();

        if (alive && upd) setUpdate(upd);
      } catch (e) {
        console.error("[update] check failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const runUpdate = async () => {
    if (!update || state !== "idle") return;
    try {
      let total = 0;
      let got = 0;
      setState("downloading");
      setPct(0);
      await update.downloadAndInstall((ev: any) => {
        switch (ev.event) {
          case "Started":
            total = ev.data?.contentLength ?? 0;
            break;
          case "Progress":
            got += ev.data?.chunkLength ?? 0;
            if (total > 0) setPct(Math.min(100, Math.round((got / total) * 100)));
            break;
          case "Finished":
            setPct(100);
            setState("installing");
            break;
        }
      });

      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      console.error("[update] install failed:", e);
      setState("idle");
      setPct(0);
    }
  };

  const busy = state !== "idle";
  const label =
    state === "downloading"
      ? `${pct}%`
      : state === "installing"
      ? "Установка…"
      : `v${update?.version ?? ""}`;

  return (
    <div
      data-tauri-drag-region
      className="relative flex h-9 shrink-0 items-center bg-bg"
    >
      <span
        data-tauri-drag-region
        className="pointer-events-none absolute inset-0 flex items-center mx-3 text-[13px] font-small tracking-wide text-text"
      >
        <div className="flex gap-1">
          <span className="text-gradient font-semibold">Aciron</span>
          <p className="text-muted">Launcher</p>
        </div>
      </span>

      {}
      <div className="ml-auto flex h-full items-center">
        {update && (
          <button
            onClick={runUpdate}
            disabled={busy}
            title={
              busy
                ? "Обновление устанавливается…"
                : `Доступно обновление v${update.version} — скачать и установить`
            }
            className="mr-1 flex h-6 items-center gap-1.5 rounded-md bg-[#22c55e] px-2 text-xs font-bold text-black transition-colors hover:bg-[#16a34a] disabled:opacity-80"
          >
            <i
              className={`fa-solid ${
                busy ? "fa-spinner fa-spin" : "fa-download"
              } text-[11px]`}
            />
            {label}
          </button>
        )}
        <p className="text-sm mx-3 font-light text-muted opacity-45">
          v{APP_VERSION} {APP_CHANNEL}
        </p>
        {}
        <div className="flex h-full items-center">
        <button
          onClick={() => appWindow?.minimize()}
          aria-label="Свернуть"
          className="grid h-9 w-9 place-items-center text-[#676767] transition-colors hover:bg-ctrl-hover rounded-md hover:text-text"
        >
          <svg width="15" height="2" viewBox="0 0 15 2" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button
          onClick={toggleMaximize}
          aria-label={maximized ? "Восстановить" : "Развернуть"}
          title={maximized ? "Восстановить" : "Развернуть"}
          className="grid h-9 w-9 place-items-center text-[#676767] transition-colors hover:bg-ctrl-hover rounded-md hover:text-text"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 1H4C2.34315 1 1 2.34315 1 4V11C1 12.6569 2.34315 14 4 14H11C12.6569 14 14 12.6569 14 11V4C14 2.34315 12.6569 1 11 1Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>

        </button>
        <button
          onClick={() => appWindow?.close()}
          aria-label="Закрыть"
          className="grid h-9 w-9 place-items-center text-[#676767] transition-colors hover:bg-[#FF3535]/50 rounded-md hover:text-[#CDCDCD]"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L14 14M1 14L14 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        </div>
      </div>
    </div>
  );
}
