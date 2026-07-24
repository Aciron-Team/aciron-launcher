import { useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { ModrinthIcon, CurseForgeIcon, FtbIcon } from "./Icons";

export type Source = "modrinth" | "curseforge" | "ftb";

export const SOURCES: {
  id: Source;
  label: string;
  Icon: (p: { size?: number; className?: string }) => React.ReactElement;
  ready: boolean;
}[] = [
  { id: "modrinth", label: "Modrinth", Icon: ModrinthIcon, ready: true },
  { id: "curseforge", label: "CurseForge", Icon: CurseForgeIcon, ready: false },
  { id: "ftb", label: "FTB", Icon: FtbIcon, ready: false },
];

export default function SourceMenu({
  value,
  onChange,
}: {
  value: Source;
  onChange: (s: Source) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const cur = SOURCES.find((s) => s.id === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent/50"
      >
        <cur.Icon size={16} />
        <span>{cur.label}</span>
        <i className={`fa-solid fa-chevron-down text-[10px] text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-panel shadow-xl shadow-black/40">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-card ${
                value === s.id ? "text-accent" : "text-text"
              }`}
            >
              <s.Icon size={18} />
              <span className="flex-1 font-medium">{s.label}</span>
              {!s.ready && (
                <span className="rounded bg-card px-1.5 py-0.5 text-[10px] text-muted">скоро</span>
              )}
              {value === s.id && <i className="fa-solid fa-check text-xs text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SourceComingSoon({ source }: { source: Source }) {
  const s = SOURCES.find((x) => x.id === source)!;
  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-card">
          <s.Icon size={34} />
        </div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <i className="fa-solid fa-hammer text-[10px]" />
          В разработке
        </div>
        <h2 className="text-lg font-bold text-text">{s.label}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Загрузка из {s.label} появится в одном из ближайших обновлений. Пока используйте Modrinth.
        </p>
      </div>
    </div>
  );
}
