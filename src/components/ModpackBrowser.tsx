import { useEffect, useRef, useState } from "react";
import { searchContent, openUrl, type ModHit } from "../api";
import SourceMenu, { type Source } from "./SourceMenu";
import Dropdown from "./Dropdown";
import ModpackDetail from "./ModpackDetail";

function packUrl(source: Source, h: ModHit): string {
  if (source === "curseforge") return `https://www.curseforge.com/minecraft/modpacks/${h.slug}`;
  if (source === "ftb") return `https://www.feed-the-beast.com/modpacks/${h.slug}`;
  return `https://modrinth.com/modpack/${h.slug}`;
}

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
  const [detail, setDetail] = useState<ModHit | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    setError("");
    searchContent(source, applied, "", "", [], index, page * PER_PAGE, PER_PAGE, "modpack")
      .then((r) => {
        if (my !== seq.current) return;
        setHits(r.hits);
        setTotal(r.total_hits);
      })
      .catch((e) => my === seq.current && setError(String(e)))
      .finally(() => my === seq.current && setLoading(false));
  }, [source, applied, index, page]);

  const doSearch = () => {
    setPage(0);
    setApplied(query);
  };

  const pickSource = (s: Source) => {
    setSource(s);
    setPage(0);
    setApplied("");
    setQuery("");
  };

  const totalPages = Math.min(Math.ceil(total / PER_PAGE), 100);
  const winStart = Math.max(0, Math.min(page - 2, totalPages - 5));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => winStart + i).filter(
    (p) => p < totalPages
  );

  if (detail) {
    return (
      <ModpackDetail
        pack={detail}
        source={source}
        onBack={() => setDetail(null)}
        onInstalled={onInstalled}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-bg px-3">
          <i className="fa-solid fa-magnifying-glass text-xs text-muted" />
          <input
            className="w-full bg-transparent py-2 text-sm text-text outline-none placeholder:text-muted/60"
            placeholder="Поиск модпаков…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
        </div>
        <button
          onClick={doSearch}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          <i className="fa-solid fa-magnifying-glass text-xs" />
          Поиск
        </button>
        <Dropdown
          value={index}
          onChange={(v) => {
            setPage(0);
            setIndex(v);
          }}
          options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
          disabled={source === "ftb"}
          className="w-40"
          align="right"
        />
        <SourceMenu value={source} onChange={pickSource} />
      </div>

      {(
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {hits.map((h) => (
              <div
                key={h.project_id}
                onClick={() => setDetail(h)}
                className="group relative flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_10px_30px_-14px] hover:shadow-accent/40"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openUrl(packUrl(source, h));
                  }}
                  title="Открыть страницу модпака"
                  className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-lg bg-bg/70 text-muted opacity-0 backdrop-blur-sm transition-opacity hover:text-accent group-hover:opacity-100"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                </button>

                <div className="flex items-start gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg">
                    {h.icon_url ? (
                      <img src={h.icon_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <i className="fa-solid fa-cubes-stacked text-lg text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <div className="truncate text-sm font-bold text-text group-hover:text-accent">
                      {h.title}
                    </div>
                    {h.author && (
                      <div className="truncate text-[11px] text-muted">
                        <i className="fa-solid fa-user mr-1" />
                        {h.author}
                      </div>
                    )}
                    <div className="mt-0.5 text-[11px] text-muted">
                      <i className="fa-solid fa-download mr-1" />
                      {fmt(h.downloads)}
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 line-clamp-2 min-h-[2.4em] text-xs leading-relaxed text-muted">
                  {h.description}
                </p>

                <div className="flex-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetail(h);
                  }}
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
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

    </div>
  );
}
