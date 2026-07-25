import { useEffect, useState } from "react";
import { isTauri } from "../api";
import { setDownloadActive } from "../downloadTask";

type Prog = { stage: string; message: string; current: number; total: number };

export default function DownloadOrb() {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState("Подготовка…");
  const [doneFlag, setDoneFlag] = useState(false);

  useEffect(() => {
    const onStart = (e: Event) => {
      setName((e as CustomEvent).detail?.name ?? "Сборка");
      setCur(0);
      setTotal(0);
      setMsg("Подготовка…");
      setDoneFlag(false);
      setVisible(true);
      setDownloadActive(true);
    };
    const onEnd = () => {
      setVisible(false);
      setDownloadActive(false);
    };
    window.addEventListener("aciron-task-start", onStart);
    window.addEventListener("aciron-task-end", onEnd);

    let un: (() => void) | undefined;
    if (isTauri) {
      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<Prog>("launch-progress", (ev) => {
          const p = ev.payload;
          if (p.stage === "modpack") {
            setCur(p.current);
            setTotal(p.total);
            setMsg(p.message);
          } else if (p.stage === "done") {
            setDoneFlag(true);
            setMsg("Готово");
            setDownloadActive(false);
            setTimeout(() => setVisible(false), 1600);
          } else if (p.stage === "error") {
            setVisible(false);
            setDownloadActive(false);
          }
        }).then((u) => (un = u));
      });
    }
    return () => {
      window.removeEventListener("aciron-task-start", onStart);
      window.removeEventListener("aciron-task-end", onEnd);
      un?.();
    };
  }, []);

  if (!visible) return null;

  const pct = doneFlag ? 100 : total > 0 ? Math.min(100, Math.round((cur / total) * 100)) : 0;
  const R = 20;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="group fixed bottom-24 right-5 z-[80] flex items-center">
      {}
      <div className="pointer-events-none mr-2 max-w-0 overflow-hidden rounded-2xl bg-panel/95 opacity-0 shadow-xl shadow-black/50 backdrop-blur transition-all duration-300 group-hover:max-w-[260px] group-hover:opacity-100">
        <div className="whitespace-nowrap px-4 py-2.5">
          <div className="truncate text-xs font-bold text-text">{name}</div>
          <div className="text-[11px] text-muted">
            {doneFlag ? "Установлено" : total > 0 ? `${cur} / ${total} файлов` : msg}
          </div>
        </div>
      </div>

      {}
      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-panel shadow-xl shadow-black/50">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={R} fill="none" stroke="var(--color-border)" strokeWidth="3.5" />
          <circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-300"
          />
        </svg>
        <i
          className={`fa-solid ${
            doneFlag ? "fa-check text-[#22c55e]" : "fa-cube text-accent"
          } text-sm`}
        />
      </div>
    </div>
  );
}
