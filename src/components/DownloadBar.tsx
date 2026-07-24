import type { LaunchStatus, Progress } from "../launch";

export default function DownloadBar({
  status,
  progress,
  error,
}: {
  status: LaunchStatus;
  progress: Progress | null;
  error: string;
}) {
  const show = status !== "idle";
  const isError = status === "error";
  const isDone = status === "done";

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  const label = isError
    ? error || "Ошибка запуска"
    : isDone
    ? "Игра запущена"
    : progress?.message ?? "Подготовка…";

  return (
    <div
      className={`overflow-hidden border-t border-border bg-panel transition-all duration-300 ${
        show ? "h-12 opacity-100" : "h-0 opacity-0"
      }`}
    >
      <div className="flex h-12 items-center gap-3 px-4">
        <i
          className={`fa-solid ${
            isError
              ? "fa-triangle-exclamation text-[#ef4444]"
              : isDone
              ? "fa-circle-check text-[#22c55e]"
              : "fa-spinner fa-spin text-[#22c55e]"
          }`}
        />
        <span
          className={`w-52 shrink-0 truncate text-sm ${
            isError ? "text-[#ef4444]" : "text-text"
          }`}
        >
          {label}
        </span>

        {}
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-bg">
          {!isError && (
            <div
              className="progress-shine relative h-full rounded-full transition-all duration-300"
              style={{
                width: `${isDone ? 100 : pct}%`,
              }}
            >
              <div className="progress-anim absolute inset-0 rounded-full" />
            </div>
          )}
        </div>

        <span className="w-12 shrink-0 text-right text-sm font-semibold text-[#22c55e] tabular-nums">
          {isDone ? "100%" : `${pct}%`}
        </span>
      </div>
    </div>
  );
}
