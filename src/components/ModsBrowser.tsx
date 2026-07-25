import { useEffect, useMemo, useRef, useState } from "react";
import {
  searchContent,
  contentCategories,
  installContent,
  type Build,
  type ContentKind,
  type ModHit,
} from "../api";
import ModDetail from "./ModDetail";
import SourceMenu, { type Source } from "./SourceMenu";
import Dropdown from "./Dropdown";
import { useToast } from "../ToastContext";

const PER_PAGE = 25;

const CTYPES: { id: ContentKind; label: string; icon: string; ptype: string }[] = [
  { id: "mod", label: "Моды", icon: "fa-puzzle-piece", ptype: "mod" },
  { id: "resourcepack", label: "Ресурспаки", icon: "fa-palette", ptype: "resourcepack" },
  { id: "shader", label: "Шейдеры", icon: "fa-wand-sparkles", ptype: "shader" },
];

const SORTS: { id: string; label: string }[] = [
  { id: "relevance", label: "Релевантность" },
  { id: "downloads", label: "Загрузки" },
  { id: "follows", label: "Подписки" },
  { id: "newest", label: "Новые" },
  { id: "updated", label: "Обновлённые" },
];

const loaderLabel: Record<string, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function ModsBrowser({
  build,
  initialQuery = "",
  initialKind = "mod",
  onBack,
  onInstalled,
}: {
  build: Build;
  initialQuery?: string;
  initialKind?: ContentKind;
  onBack: () => void;
  onInstalled: (b: Build) => void;
}) {
  const [source, setSource] = useState<Source>("modrinth");
  const [ctype, setCtype] = useState<ContentKind>(initialKind);
  const [query, setQuery] = useState(initialQuery);
  const [applied, setApplied] = useState(initialQuery);
  const [index, setIndex] = useState("relevance");
  const [cats, setCats] = useState<string[]>([]);
  const [allCats, setAllCats] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [hits, setHits] = useState<ModHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [installing, setInstalling] = useState("");
  const [detailMod, setDetailMod] = useState<ModHit | null>(null);
  const seq = useRef(0);
  const toast = useToast();

  const installedIds = useMemo(
    () => new Set(build.mods.map((m) => m.project_id)),
    [build.mods]
  );

  const ptype = CTYPES.find((c) => c.id === ctype)!.ptype;
  const loaderFilter = ctype === "mod" ? build.loader : "";

  useEffect(() => {
    if (source === "ftb") return;
    contentCategories(source).then(setAllCats).catch(() => {});
  }, [source]);

  useEffect(() => {
    if (source === "ftb") return;
    const my = ++seq.current;
    setLoading(true);
    setError("");
    searchContent(source, applied, loaderFilter, build.mc_version, cats, index, page * PER_PAGE, PER_PAGE, ptype)
      .then((r) => {
        if (my !== seq.current) return;
        setHits(r.hits);
        setTotal(r.total_hits);
      })
      .catch((e) => my === seq.current && setError(String(e)))
      .finally(() => my === seq.current && setLoading(false));
  }, [source, applied, cats, index, page, loaderFilter, build.mc_version, ptype]);

  const doSearch = () => {
    setPage(0);
    setApplied(query);
  };

  const pickSource = (s: Source) => {
    setSource(s);
    setPage(0);
    setCats([]);
  };

  const pickCtype = (id: ContentKind) => {
    setCtype(id);
    setCats([]);
    setPage(0);
  };

  const install = async (h: ModHit) => {
    if (installedIds.has(h.project_id) || installing) return;
    setInstalling(h.project_id);
    try {
      const updated = await installContent(source, build.id, h.project_id);
      onInstalled(updated);
      toast(`«${h.title}» установлен`, "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setInstalling("");
    }
  };

  const toggleCat = (c: string) => {
    setPage(0);
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const totalPages = Math.min(Math.ceil(total / PER_PAGE), 100);
  const pageWindow = useMemo(() => {
    const win: number[] = [];
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    for (let i = start; i < Math.min(totalPages, start + 5); i++) win.push(i);
    return win;
  }, [page, totalPages]);

  if (detailMod) {
    return (
      <ModDetail
        build={build}
        hit={detailMod}
        kind={ctype}
        source={source}
        onBack={() => setDetailMod(null)}
        onInstalled={onInstalled}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-text"
        >
          <i className="fa-solid fa-arrow-left" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-text">Каталог · {build.name}</div>
          <div className="text-xs text-muted">
            {build.mc_version} · {loaderLabel[build.loader] ?? build.loader}
            {total ? ` · найдено ${total}` : ""}
          </div>
        </div>
        <SourceMenu value={source} onChange={pickSource} allow={["modrinth", "curseforge"]} />
        {}
        <div className="flex gap-1 rounded-lg bg-bg p-1">
          {CTYPES.map((c) => (
            <button
              key={c.id}
              onClick={() => pickCtype(c.id)}
              title={c.label}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                ctype === c.id ? "bg-accent text-bg" : "text-muted hover:text-text"
              }`}
            >
              <i className={`fa-solid ${c.icon} text-xs`} />
              <span className="hidden sm:inline">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {source === "ftb" ? (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-card text-accent">
              <i className="fa-solid fa-layer-group text-2xl" />
            </div>
            <h2 className="text-lg font-bold text-text">FTB — это готовые сборки</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              У Feed The Beast нет отдельных модов — только целые модпаки. Найти их можно во
              вкладке «Сборки» → «Добавить сборку».
            </p>
          </div>
        </div>
      ) : (
      <>
      {}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-bg px-3">
            <i className="fa-solid fa-magnifying-glass text-xs text-muted" />
            <input
              autoFocus
              className="w-full bg-transparent py-2 text-sm text-text outline-none placeholder:text-muted/60"
              placeholder={`Поиск: ${CTYPES.find((c) => c.id === ctype)!.label.toLowerCase()} на ${
                source === "curseforge" ? "CurseForge" : "Modrinth"
              }…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
          </div>
          <button
            onClick={doSearch}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
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
            className="w-40"
            align="right"
          />
          {ctype === "mod" && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                showFilters || cats.length
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-border text-muted hover:text-text"
              }`}
            >
              <i className="fa-solid fa-sliders text-xs" />
              {cats.length ? cats.length : "Фильтры"}
            </button>
          )}
        </div>

        {ctype === "mod" && showFilters && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allCats.map((c) => (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ${
                  cats.includes(c)
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
            <i className="fa-solid fa-circle-exclamation mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
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
            {hits.map((h) => {
              const isInstalled = installedIds.has(h.project_id);
              return (
                <div
                  key={h.project_id}
                  onClick={() => setDetailMod(h)}
                  className="group flex cursor-pointer flex-col rounded-2xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_10px_30px_-14px] hover:shadow-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg">
                      {h.icon_url ? (
                        <img src={h.icon_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <i className="fa-solid fa-cube text-lg text-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
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

                  {h.categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.categories.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-bg px-2 py-0.5 text-[10px] capitalize text-muted"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      install(h);
                    }}
                    disabled={isInstalled || !!installing}
                    className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                      isInstalled
                        ? "cursor-default bg-bg text-text"
                        : "bg-accent text-bg hover:bg-accent-hover active:bg-accent-active disabled:opacity-60"
                    }`}
                  >
                    {installing === h.project_id ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" />
                        Установка…
                      </>
                    ) : isInstalled ? (
                      <>
                        <i className="fa-solid fa-check" />
                        Установлено
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-download" />
                        Скачать
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-border py-2.5">
          <PageBtn
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            icon="fa-chevron-left"
          />
          {pageWindow[0] > 0 && <span className="px-1 text-xs text-muted">…</span>}
          {pageWindow.map((p) => (
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
          {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
            <span className="px-1 text-xs text-muted">…</span>
          )}
          <PageBtn
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            icon="fa-chevron-right"
          />
        </div>
      )}
      </>
      )}
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  icon,
}: {
  disabled: boolean;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <i className={`fa-solid ${icon} text-xs`} />
    </button>
  );
}
