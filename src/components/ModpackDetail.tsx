import { useEffect, useState } from "react";
import {
  contentProject,
  installModpackContent,
  openUrl,
  type ModHit,
  type ModProject,
  type ModVersion,
  type SourceId,
} from "../api";
import { useToast } from "../ToastContext";
import VersionList from "./VersionList";
import Lightbox from "./Lightbox";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function packUrl(source: SourceId, slug: string): string {
  if (source === "curseforge") return `https://www.curseforge.com/minecraft/modpacks/${slug}`;
  if (source === "ftb") return `https://www.feed-the-beast.com/modpacks/${slug}`;
  return `https://modrinth.com/modpack/${slug}`;
}

export default function ModpackDetail({
  pack,
  source,
  onBack,
  onInstalled,
}: {
  pack: ModHit;
  source: SourceId;
  onBack: () => void;
  onInstalled: () => void;
}) {
  const [project, setProject] = useState<ModProject | null>(null);
  const [tab, setTab] = useState<"about" | "versions">("about");
  const [busy, setBusy] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    contentProject(source, pack.project_id).then(setProject).catch(() => {});
  }, [source, pack.project_id]);

  const install = async (v: ModVersion) => {
    if (busy) return;
    setBusy(v.id);

    window.dispatchEvent(new CustomEvent("aciron-task-start", { detail: { name: pack.title } }));
    try {
      await installModpackContent(source, pack.project_id, v.id);
      toast(`Сборка «${pack.title}» (${v.version_number}) установлена`, "success");
      onInstalled();
    } catch (e) {
      toast(String(e), "error");
      window.dispatchEvent(new Event("aciron-task-end"));
    } finally {
      setBusy(null);
    }
  };

  const icon = project?.icon_url || pack.icon_url;
  const slug = project?.slug || pack.slug;
  const downloads = project?.downloads ?? pack.downloads;
  const gallery = project?.gallery ?? [];

  const links: { label: string; url?: string; icon: string }[] = [
    {
      label: source === "curseforge" ? "CurseForge" : source === "ftb" ? "FTB" : "Modrinth",
      url: project?.website_url || packUrl(source, slug),
      icon: "fa-arrow-up-right-from-square",
    },
    { label: "Исходники", url: project?.source_url, icon: "fa-code" },
    { label: "Проблемы", url: project?.issues_url, icon: "fa-bug" },
    { label: "Discord", url: project?.discord_url, icon: "fa-discord" },
  ];

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
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg">
          {icon ? (
            <img src={icon} alt="" className="h-full w-full object-cover" />
          ) : (
            <i className="fa-solid fa-cubes-stacked text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold text-text">{pack.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted">
            {pack.author && (
              <span>
                <i className="fa-solid fa-user mr-1" />
                {pack.author}
              </span>
            )}
            <span>
              <i className="fa-solid fa-download mr-1" />
              {fmt(downloads)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setTab("versions")}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
        >
          <i className="fa-solid fa-download" />
          Установить
        </button>
      </div>

      {}
      <div className="flex items-center gap-1 border-b border-border px-4">
        {([
          ["about", "Описание"],
          ["versions", "Версии"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === id ? "text-text" : "text-muted hover:text-text"
            }`}
          >
            {label}
            {tab === id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "versions" ? (
          <div className="p-4">
            <p className="mb-3 text-xs text-muted">
              Выберите версию — она установится как отдельная сборка.
            </p>
            <VersionList
              source={source}
              projectId={pack.project_id}
              actionLabel="Скачать"
              showFilters
              busyId={busy}
              onPick={install}
            />
          </div>
        ) : (
          <>
            {gallery.length > 0 && (
              <div className="flex gap-3 overflow-x-auto border-b border-border p-4">
                {gallery.map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightbox(idx)}
                    className="group relative h-40 shrink-0 overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={g.url}
                      alt={g.title ?? ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <i className="fa-solid fa-magnifying-glass-plus text-white" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="p-5">
              <p className="text-sm leading-relaxed text-text">{pack.description}</p>

              {pack.categories.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {pack.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {links
                  .filter((l) => l.url)
                  .map((l) => (
                    <button
                      key={l.label}
                      onClick={() => openUrl(l.url!)}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      <i className={`${l.icon === "fa-discord" ? "fa-brands" : "fa-solid"} ${l.icon}`} />
                      {l.label}
                    </button>
                  ))}
              </div>

              <p className="mt-6 text-xs text-muted">
                Список версий и установка — во вкладке «Версии».
              </p>
            </div>
          </>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox images={gallery} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
