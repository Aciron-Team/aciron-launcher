import { useEffect, useState } from "react";
import { projectVersions, type ModVersion } from "../api";

const typeMeta: Record<string, { label: string; color: string }> = {
  release: { label: "Релиз", color: "#4ade80" },
  beta: { label: "Beta", color: "#fbbf24" },
  alpha: { label: "Alpha", color: "#f87171" },
};

export default function VersionList({
  projectId,
  currentVersionId,
  actionLabel = "Установить",
  busyId,
  onPick,
}: {
  projectId: string;
  currentVersionId?: string;
  actionLabel?: string;
  busyId?: string | null;
  onPick: (v: ModVersion) => void;
}) {
  const [versions, setVersions] = useState<ModVersion[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setVersions(null);
    setShowAll(false);
    projectVersions(projectId)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [projectId]);

  if (versions === null) {
    return (
      <div className="p-8 text-center text-sm text-muted">
        <i className="fa-solid fa-spinner fa-spin mr-2" />
        Загрузка версий…
      </div>
    );
  }
  if (versions.length === 0) {
    return <div className="p-8 text-center text-sm text-muted">Версий не найдено.</div>;
  }

  const shown = showAll ? versions : versions.slice(0, 40);

  return (
    <div className="space-y-2">
      {shown.map((v) => {
        const meta = typeMeta[v.version_type] ?? { label: v.version_type, color: "var(--color-muted)" };
        const isCurrent = !!currentVersionId && v.id === currentVersionId;
        const isBusy = busyId === v.id;
        const gv = v.game_versions ?? [];
        return (
          <div
            key={v.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5"
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color }}
            >
              <i className="fa-solid fa-file-zipper text-xs" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-text">
                  {v.version_number || v.name}
                </span>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}
                >
                  {meta.label}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                <span>
                  {gv.slice(0, 4).join(", ")}
                  {gv.length > 4 ? "…" : ""}
                </span>
                {v.loaders?.length > 0 && <span className="capitalize">· {v.loaders.join(", ")}</span>}
                {v.date_published && (
                  <span>· {new Date(v.date_published).toLocaleDateString("ru-RU")}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => !isCurrent && !isBusy && onPick(v)}
              disabled={isCurrent || isBusy}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                isCurrent
                  ? "cursor-default bg-bg text-text"
                  : "bg-accent text-bg hover:bg-accent-hover active:bg-accent-active disabled:opacity-60"
              }`}
            >
              <i className={`fa-solid ${isBusy ? "fa-spinner fa-spin" : isCurrent ? "fa-check" : "fa-download"}`} />
              {isBusy ? "…" : isCurrent ? "Текущая" : actionLabel}
            </button>
          </div>
        );
      })}
      {!showAll && versions.length > 40 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full rounded-lg border border-border py-2 text-xs text-muted transition-colors hover:text-text"
        >
          Показать все ({versions.length})
        </button>
      )}
    </div>
  );
}
