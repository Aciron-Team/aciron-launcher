import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { APP_VERSION, APP_CHANNEL } from "../config";
import { checkUpdate, openUrl, type UpdateInfo } from "../api";

const appWindow = (() => {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
})();

export default function TitleBar() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let alive = true;
    checkUpdate().then((u) => {
      if (alive && u.available) setUpdate(u);
    });
    return () => {
      alive = false;
    };
  }, []);

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
            onClick={() => openUrl(update.url)}
            title={`Доступно обновление v${update.latest} — скачать`}
            className="mr-1 flex h-6 items-center gap-1.5 rounded-md bg-[#22c55e] px-2 text-xs font-bold text-black transition-colors hover:bg-[#16a34a]"
          >
            <i className="fa-solid fa-download text-[11px]" />
            v{update.latest}
          </button>
        )}
        <p className="text-sm mx-3 font-light text-muted opacity-45">
          v{APP_VERSION} {APP_CHANNEL}
        </p>
        <button
          onClick={() => appWindow?.minimize()}
          aria-label="Свернуть"
          className="grid h-9 w-11 place-items-center text-muted transition-colors hover:bg-ctrl-hover rounded-[8px] hover:text-text"
        >
          <i className="fa-solid fa-minus text-xs" />
        </button>
        <button
          onClick={() => appWindow?.close()}
          aria-label="Закрыть"
          className="grid h-9 w-11 place-items-center text-muted transition-colors hover:bg-ctrl-hover rounded-[8px] hover:text-[#ef4444]"
        >
          <i className="fa-solid fa-xmark text-sm" />
        </button>
      </div>
    </div>
  );
}
