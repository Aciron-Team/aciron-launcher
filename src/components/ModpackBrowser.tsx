import { useEffect, useRef, useState } from "react";
import { modrinthSearch, openUrl, type ModHit } from "../api";
import SourceMenu, { SourceComingSoon, type Source } from "./SourceMenu";
import VersionPickerModal from "./VersionPickerModal";

const PER_PAGE = 25;
const SORTS = [
  { id: "downloads", label: "Загрузки" },
  { id: "follows", label: "Подписки" },
  { id: "relevance", label: "Релевантность" },
  { id: "newest", label: "Новые" },
  { id: "updated", label: "Обновлённые" },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function ModpackBrowser({ onInstalled }: { onInstalled: () => void }) {
  const [source, setSource] = useState<Source>("modrinth");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [index, setIndex] = useState("downloads");
  const [page, setPage] = useState(0);
  const [hits, setHits] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<ModHit | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    setError("");
    modrinthSearch(applied, "", "", [], index, page * PER_PAGE, PER_PAGE, "modpack")
      .then((r) => {
        if (my !== seq.current) return;
        setHits(r.hits);
        setTotal(r.total_hits);
      })
      .catch((e) => my === seq.current && setError(String(e)))
      .finally(() => my === seq.current && setLoading(false));
  }, [applied, index, page]);

  const doSearch = () => {
    setPage(0);
    setApplied(query);
  };

  const totalPages = Math.min(Math.ceil(total / PER_PAGE), 100);
  const winStart = Math.max(0, Math.min(page - 2, totalPages - 5));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => winStart + i).filter(
    (p) => p < totalPages
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-bg px-3">
          <i className="fa-solid fa-magnifying-glass text-xs text-muted" />
          <input
            className="w-full bg-transparent py-2 text-sm text-text outline-none placeholder:text-muted/60"
            placeholder="Поиск модпаков…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            disabled={source !== "modrinth"}
          />
        </div>
        <button
          onClick={doSearch}
          disabled={source !== "modrinth"}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <i className="fa-solid fa-magnifying-glass text-xs" />
          Поиск
        </button>
        <select
          value={index}
          onChange={(e) => {
            setPage(0);
            setIndex(e.target.value);
          }}
          disabled={source !== "modrinth"}
          className="rounded-lg border border-border bg-bg px-2 py-2 text-sm text-text outline-none disabled:opacity-50"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <SourceMenu value={source} onChange={setSource} />
      </div>

      {source !== "modrinth" ? (
        <SourceComingSoon source={source} />
      ) : (
      <>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error && (
          <div className="mb-2 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
            {error}
          </div>
        )}
        {loading ? (
          <div className="grid place-items-center py-16 text-muted">
            <i className="fa-solid fa-spinner fa-spin text-2xl" />
          </div>
        ) : hits.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">Ничего не найдено</div>
        ) : (
          <div className="grid gap-2">
            {hits.map((h) => (
              <div
                key={h.project_id}
                className="group flex items-center gap-3.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-accent/50"
              >
                <button
                  onClick={() => openUrl(`https://modrinth.com/modpack/${h.slug}`)}
                  title="Открыть на Modrinth"
                  className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg"
                >
                  {h.icon_url ? (
                    <img src={h.icon_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-cubes-stacked text-lg text-muted" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-text">{h.title}</span>
                    <span className="shrink-0 text-[11px] text-muted">
                      <i className="fa-solid fa-download mr-1" />
                      {fmt(h.downloads)}
                    </span>
                  </div>
                  <div className="line-clamp-1 text-xs text-muted">{h.description}</div>
                </div>
                <button
                  onClick={() => setPicker(h)}
                  className="flex w-32 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-hover"
                >
                  <i className="fa-solid fa-download" />
                  Установить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-border py-2.5">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-text disabled:opacity-30"
          >
            <i className="fa-solid fa-chevron-left text-xs" />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition-colors ${
                p === page ? "bg-accent text-bg" : "text-muted hover:bg-card hover:text-text"
              }`}
            >
              {p + 1}
            </button>
          ))}
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-text disabled:opacity-30"
          >
            <i className="fa-solid fa-chevron-right text-xs" />
          </button>
        </div>
      )}
      </>
      )}

      {picker && (
        <VersionPickerModal
          pack={picker}
          onClose={() => setPicker(null)}
          onInstalled={onInstalled}
        />
      )}
    </div>
  );
}
