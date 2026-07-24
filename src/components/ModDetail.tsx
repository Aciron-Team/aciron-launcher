import { useEffect, useState } from "react";
import {
  modrinthProject,
  modrinthInstall,
  modrinthInstallVersion,
  openUrl,
  type Build,
  type ContentKind,
  type ModHit,
  type ModProject,
  type ModVersion,
} from "../api";
import { useToast } from "../ToastContext";
import VersionList from "./VersionList";

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

export default function ModDetail({
  build,
  hit,
  kind = "mod",
  onBack,
  onInstalled,
}: {
  build: Build;
  hit: ModHit;
  kind?: ContentKind;
  onBack: () => void;
  onInstalled: (b: Build) => void;
}) {
  const [project, setProject] = useState<ModProject | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"about" | "versions">("about");
  const [verBusy, setVerBusy] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    modrinthProject(hit.project_id).then(setProject).catch(() => {});
  }, [hit.project_id]);

  const installedMod = build.mods.find((m) => m.project_id === hit.project_id);
  const installed = !!installedMod;

  const installVersion = async (v: ModVersion) => {
    if (verBusy) return;
    setVerBusy(v.id);
    try {
      const updated = await modrinthInstallVersion(build.id, hit.project_id, v.id);
      onInstalled(updated);
      toast(`«${hit.title}» ${v.version_number} установлен`, "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setVerBusy(null);
    }
  };

  const kindLabel =
    kind === "resourcepack" ? "ресурспак" : kind === "shader" ? "шейдер" : "мод";

  const install = async () => {
    if (installed || busy) return;
    setBusy(true);
    try {
      const updated = await modrinthInstall(build.id, hit.project_id);
      onInstalled(updated);
      toast(`«${hit.title}» установлен`, "success");
    } catch (e) {
      toast(String(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const icon = project?.icon_url || hit.icon_url;
  const slug = project?.slug || hit.slug;
  const downloads = project?.downloads ?? hit.downloads;
  const gallery = project?.gallery ?? [];

  const links: { label: string; url?: string; icon: string }[] = [
    { label: "Modrinth", url: `https://modrinth.com/mod/${slug}`, icon: "fa-arrow-up-right-from-square" },
    { label: "Исходники", url: project?.source_url, icon: "fa-code" },
    { label: "Проблемы", url: project?.issues_url, icon: "fa-bug" },
    { label: "Wiki", url: project?.wiki_url, icon: "fa-book" },
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
            <i className="fa-solid fa-cube text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold text-text">{hit.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted">
            {hit.author && (
              <span>
                <i className="fa-solid fa-user mr-1" />
                {hit.author}
              </span>
            )}
            <span>
              <i className="fa-solid fa-download mr-1" />
              {fmt(downloads)}
            </span>
            {project && (
              <span>
                <i className="fa-solid fa-heart mr-1" />
                {fmt(project.followers)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={install}
          disabled={installed || busy}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
            installed
              ? "cursor-default bg-bg text-text"
              : "bg-accent text-bg hover:bg-accent-hover active:bg-accent-active disabled:opacity-60"
          }`}
        >
          <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : installed ? "fa-check" : "fa-download"}`} />
          {busy ? "Установка…" : installed ? "Установлено" : "Скачать"}
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
            <VersionList
              projectId={hit.project_id}
              currentVersionId={installedMod?.version_id}
              busyId={verBusy}
              onPick={installVersion}
            />
          </div>
        ) : (
          <>
        {}
        {gallery.length > 0 && (
          <div className="flex gap-3 overflow-x-auto border-b border-border p-4">
            {gallery.map((g, i) => (
              <img
                key={i}
                src={g.url}
                alt={g.title ?? ""}
                className="h-40 shrink-0 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}

        <div className="p-5">
          {}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted">
            <i className="fa-solid fa-cubes-stacked text-accent" />
            Установить {kindLabel} в: <span className="text-text">{build.name}</span> ·{" "}
            {build.mc_version} · {loaderLabel[build.loader] ?? build.loader}
          </div>

          {}
          <p className="text-sm leading-relaxed text-text">{hit.description}</p>

          {}
          {hit.categories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {hit.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {}
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
            Полное описание и changelog — на странице проекта (кнопка выше). Список версий — во
            вкладке «Версии».
          </p>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
