import { useEffect, useState } from "react";
import VersionMenu from "./VersionMenu";
import AccountMenu from "./AccountMenu";
import { getSettings, openFolder } from "../api";
import { useLauncherCtx } from "../LauncherContext";

export default function PlayBar() {
  const [versionsDir, setVersionsDir] = useState("");
  const [versionId, setVersionId] = useState<string | null>(null);
  const { status, launch, gameRunning, stop } = useLauncherCtx();

  useEffect(() => {
    getSettings().then((s) => setVersionsDir(s.versions_dir));
  }, []);

  const busy = status === "running";

  return (
    <div className="flex h-20 shrink-0 items-center gap-3 border-t border-border bg-panel px-4">
      {gameRunning ? (
        <button
          onClick={() => stop()}
          className="group flex h-14 min-w-[168px] items-center justify-center gap-3 rounded-xl bg-[#ef4444] px-9 font-bold text-white transition-colors hover:bg-[#dc2626] active:bg-[#b91c1c]"
        >
          <i className="fa-solid fa-stop text-base" />
          <span className="text-lg tracking-wide">Закрыть</span>
        </button>
      ) : (
        <button
          onClick={() => versionId && launch(versionId)}
          disabled={busy || !versionId}
          title={!versionId ? "Сначала установите версию" : undefined}
          className="group flex h-14 min-w-[168px] items-center justify-center gap-3 rounded-xl bg-accent px-9 font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:cursor-not-allowed disabled:opacity-60"
        >
          <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-play"} text-base`} />
          <span className="text-lg tracking-wide">{busy ? "Загрузка…" : "Играть"}</span>
        </button>
      )}

      <VersionMenu onChange={setVersionId} />

      {}
      <button
        onClick={() => versionsDir && openFolder(versionsDir)}
        title="Открыть папку версий"
        className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-transparent bg-card/60 text-muted transition-colors hover:bg-card hover:text-accent"
      >
        <i className="fa-solid fa-folder-open" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <AccountMenu />
      </div>
    </div>
  );
}
