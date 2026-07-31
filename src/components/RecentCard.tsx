import { useEffect, useState } from "react";
import { getBuildImage, type Recent } from "../api";
import { cardInDelay } from "../anim";
import { coverFor } from "../covers";
import { useLauncherCtx } from "../LauncherContext";

function playtime(secs: number): string {
  if (secs < 60) return "< 1мин.";
  if (secs < 3600) return `${Math.round(secs / 60)}мин.`;
  return `${Math.floor(secs / 3600)}ч.`;
}

export default function RecentCard({
  recent,
  index = 0,
  dying = false,
  onRemove,
  onOpen,
}: {
  recent: Recent;

  index?: number;

  dying?: boolean;
  onRemove: () => void;
  onOpen?: (buildId: string) => void;
}) {
  const isBuild = recent.kind === "build";
  const buildId = isBuild ? recent.id.replace(/^build:/, "") : "";
  const { launch, isRunning, stop } = useLauncherCtx();

  // Настоящая иконка сборки (как в списке сборок), иначе — статичная обложка.
  const [buildImg, setBuildImg] = useState<string | null>(null);
  useEffect(() => {
    if (!isBuild) return;
    let alive = true;
    getBuildImage(buildId)
      .then((s) => alive && setBuildImg(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isBuild, buildId]);

  const img = buildImg ?? coverFor(recent.id, recent.mc_version);

  const [busy, setBusy] = useState(false);
  const running = isRunning(recent.id);
  const openable = isBuild && !!onOpen;

  return (
    <div
      data-flip-id={recent.id}
      style={dying ? undefined : cardInDelay(index)}
      onClick={openable ? () => onOpen!(buildId) : undefined}
      className={`group relative h-[150px] w-[285px] border-[#232427]/65 border-1 shrink-0 overflow-hidden rounded-[16px] bg-card ${
        dying ? "card-fall" : "card-in"
      } ${openable ? "cursor-pointer" : ""}`}
    >
      {img ? (
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-card to-bg">
          <i className="fa-solid fa-cube absolute right-4 top-4 text-4xl text-accent/25" />
        </div>
      )}

      {}
      <div className="absolute inset-0 bg-black/80" />

      {}
      {openable && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/45 px-2 py-1 text-[10px] font-medium text-white/80 opacity-0 transition group-hover:opacity-100">
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
          Открыть сборку
        </div>
      )}

      {}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Убрать из последних запусков"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/50 text-white/70 opacity-0 transition hover:bg-[#FF3535]/50 hover:text-white group-hover:opacity-100"
      >
        <i className="fa-solid fa-xmark text-xs" />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-white">
            {recent.kind === "build" ? recent.name : `MC ${recent.name}`}
          </div>
          <div className="text-[10px] text-[#818181]">Вы играли {playtime(recent.playtime_secs)}</div>
        </div>
        {running ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              stop(recent.id);
            }}
            className="h-9 shrink-0 rounded-lg bg-[#ef4444] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626]"
          >
            Закрыть
          </button>
        ) : (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (busy) return;
              setBusy(true);
              try {
                await launch(recent.id);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="h-9 shrink-0 rounded-[8px] bg-accent px-4 text-sm font-semibold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <i className="fa-solid fa-spinner fa-spin" /> : "Продолжить"}
          </button>
        )}
      </div>
    </div>
  );
}
