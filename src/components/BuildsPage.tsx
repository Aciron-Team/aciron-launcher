import { useEffect, useState } from "react";
import {
  getBuilds,
  deleteBuild,
  openBuildFolder,
  removeMod,
  toggleMod,
  setBuildImage,
  refreshBuildContent,
  pickFile,
  type Build,
  type ContentKind,
} from "../api";
import CreateBuildModal from "./CreateBuildModal";
import ModsBrowser from "./ModsBrowser";
import ConfirmModal from "./ConfirmModal";
import BuildCover from "./BuildCover";
import BuildSettingsModal from "./BuildSettingsModal";
import ModpackBrowser from "./ModpackBrowser";
import { useToast } from "../ToastContext";

const loaderLabel: Record<string, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
};

const CONTENT_TABS: { id: ContentKind; label: string; icon: string; empty: string }[] = [
  { id: "mod", label: "Моды", icon: "fa-puzzle-piece", empty: "Найдите и установите моды с Modrinth" },
  { id: "resourcepack", label: "Ресурспаки", icon: "fa-palette", empty: "Добавьте ресурспаки с Modrinth" },
  { id: "shader", label: "Шейдеры", icon: "fa-wand-sparkles", empty: "Добавьте шейдеры с Modrinth" },
];

type View = "list" | "detail" | "browse";

export default function BuildsPage() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [createModal, setCreateModal] = useState(false);
  const [browseQuery, setBrowseQuery] = useState("");
  const [modSearch, setModSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState<Build | null>(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [tab, setTab] = useState<"mine" | "popular">("mine");
  const [contentTab, setContentTab] = useState<ContentKind>("mod");
  const [browseKind, setBrowseKind] = useState<ContentKind>("mod");
  const toast = useToast();

  const updateBuild = (updated: Build) =>
    setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));

  const refresh = async () => {
    const list = await getBuilds();
    setBuilds(list);
    setSelectedId((prev) => (prev && list.some((b) => b.id === prev) ? prev : null));
  };

  useEffect(() => {
    refresh();
  }, []);

  const selected = builds.find((b) => b.id === selectedId) ?? null;

  const openBuild = async (id: string) => {
    setSelectedId(id);
    setView("detail");
    setContentTab("mod");
    setModSearch("");

    try {
      const updated = await refreshBuildContent(id);
      setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    } catch {

    }
  };

  const doRefresh = async () => {
    if (!selected) return;
    const updated = await refreshBuildContent(selected.id);
    setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    toast("Список контента обновлён", "info");
  };

  const confirmDelete = async () => {
    const b = confirmDel;
    if (!b) return;
    await deleteBuild(b.id);
    await refresh();
    toast(`Сборка «${b.name}» удалена`, "success");
  };

  const removeOneMod = async (projectId: string, name: string) => {
    if (!selected) return;
    const updated = await removeMod(selected.id, projectId);
    setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    toast(`Мод «${name}» удалён`, "success");
  };

  const toggleOneMod = async (projectId: string) => {
    if (!selected) return;
    const updated = await toggleMod(selected.id, projectId);
    setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    const m = updated.mods.find((x) => x.project_id === projectId);
    if (m) toast(`Мод «${m.name}» ${m.enabled ? "включён" : "выключен"}`, "info");
  };

  const onInstalled = (updated: Build) =>
    setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));

  const changeCover = async () => {
    if (!selected) return;
    const f = await pickFile("Изображение", ["png", "jpg", "jpeg", "webp", "gif"]);
    if (!f) return;
    const updated = await setBuildImage(selected.id, f);
    setBuilds((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    toast("Обложка обновлена", "success");
  };

  const goBrowse = (query = "", kind: ContentKind = "mod") => {
    setBrowseQuery(query);
    setBrowseKind(kind);
    setView("browse");
  };

  if (view === "browse" && selected) {
    return (
      <ModsBrowser
        build={selected}
        initialQuery={browseQuery}
        initialKind={browseKind}
        onBack={() => setView("detail")}
        onInstalled={onInstalled}
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <button
            onClick={() => setView("list")}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-text"
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
          <button
            onClick={changeCover}
            title="Изменить обложку"
            className="group relative h-10 w-10 shrink-0"
          >
            <BuildCover build={selected} className="h-10 w-10" />
            <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <i className="fa-solid fa-camera text-xs text-white" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-text">{selected.name}</div>
            <div className="text-xs text-muted">
              {selected.mc_version} · {loaderLabel[selected.loader] ?? selected.loader} ·{" "}
              {selected.mods.length} эл.
            </div>
          </div>
          <button
            onClick={doRefresh}
            title="Обновить список (подхватить ручные файлы)"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-accent"
          >
            <i className="fa-solid fa-arrows-rotate" />
          </button>
          <button
            onClick={() => setSettingsModal(true)}
            title="Настройка сборки"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-accent"
          >
            <i className="fa-solid fa-gear" />
          </button>
          <button
            onClick={() => openBuildFolder(selected.id)}
            title="Открыть папку сборки"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-accent"
          >
            <i className="fa-solid fa-folder-open" />
          </button>
        </div>

        {settingsModal && (
          <BuildSettingsModal
            build={selected}
            onClose={() => setSettingsModal(false)}
            onUpdated={updateBuild}
          />
        )}

        {}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <div className="flex gap-1 rounded-lg bg-bg p-1">
            {CONTENT_TABS.map((t) => {
              const count = selected.mods.filter((m) => m.kind === t.id).length;
              return (
                <button
                  key={t.id}
                  onClick={() => setContentTab(t.id)}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                    contentTab === t.id ? "bg-accent text-bg" : "text-muted hover:text-text"
                  }`}
                >
                  <i className={`fa-solid ${t.icon} text-xs`} />
                  {t.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 text-[10px] font-bold ${
                        contentTab === t.id ? "bg-bg/25 text-bg" : "bg-card text-muted"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex w-52 items-center gap-2 rounded-lg border border-border bg-bg px-3">
              <i className="fa-solid fa-magnifying-glass text-xs text-muted" />
              <input
                className="w-full bg-transparent py-1.5 text-sm text-text outline-none placeholder:text-muted/60"
                placeholder="Найти…"
                value={modSearch}
                onChange={(e) => setModSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goBrowse(modSearch, contentTab)}
              />
            </div>
            <button
              onClick={() => goBrowse(modSearch, contentTab)}
              className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
            >
              <i className="fa-solid fa-plus text-xs" />
              Добавить
            </button>
          </div>
        </div>

        {(() => {
          const meta = CONTENT_TABS.find((t) => t.id === contentTab)!;
          const items = selected.mods.filter((m) => m.kind === contentTab);
          if (items.length === 0) {
            return (
              <div className="grid flex-1 place-items-center text-center">
                <div>
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-card text-2xl text-muted">
                    <i className={`fa-solid ${meta.icon}`} />
                  </div>
                  <h2 className="font-semibold text-text">Здесь пока пусто</h2>
                  <p className="mt-1 mb-4 text-sm text-muted">{meta.empty}</p>
                  <button
                    onClick={() => goBrowse("", contentTab)}
                    className="mx-auto flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
                  >
                    <i className={`fa-solid ${meta.icon}`} />
                    Добавить {meta.label.toLowerCase()}
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-1.5">
                {items.map((m) => (
                  <div
                    key={m.project_id}
                    className={`group flex items-center gap-3.5 rounded-xl border bg-card p-3 transition-all hover:border-accent/40 ${
                      m.enabled ? "border-border" : "border-border/60 opacity-60"
                    }`}
                  >
                    <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg">
                      {m.icon_url ? (
                        <img src={m.icon_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <i className={`fa-solid ${meta.icon} text-muted`} />
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                          m.enabled ? "bg-[#4caf50]" : "bg-muted"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-text">{m.name}</span>
                        {m.project_id.startsWith("local:") && (
                          <span className="shrink-0 rounded bg-bg px-1.5 py-0.5 text-[10px] text-muted">
                            вручную
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {m.enabled ? m.filename : "Выключен"}
                      </div>
                    </div>
                    {}
                    <button
                      onClick={() => toggleOneMod(m.project_id)}
                      title={m.enabled ? "Выключить" : "Включить"}
                      className={`relative h-6 w-11 shrink-0 rounded-full opacity-0 transition-all group-hover:opacity-100 ${
                        m.enabled ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                          m.enabled ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => removeOneMod(m.project_id, m.name)}
                      title="Удалить"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted opacity-0 transition-opacity hover:text-[#ef4444] group-hover:opacity-100"
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
        <div className="flex gap-1 rounded-lg bg-bg p-1">
          {(
            [
              { id: "mine", icon: "fa-cubes-stacked", label: "Мои сборки" },
              { id: "popular", icon: "fa-fire", label: "Популярные" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-accent text-bg" : "text-muted hover:text-text"
              }`}
            >
              <i className={`fa-solid ${t.icon} text-xs`} />
              {t.label}
            </button>
          ))}
        </div>
        {tab === "mine" && (
          <button
            onClick={() => setCreateModal(true)}
            className="ml-auto flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
          >
            <i className="fa-solid fa-plus" />
            Создать сборку
          </button>
        )}
      </div>

      {tab === "popular" ? (
        <ModpackBrowser
          onInstalled={() => {
            refresh();
            setTab("mine");
          }}
        />
      ) : (
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {builds.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-card text-2xl text-muted">
                <i className="fa-solid fa-cubes-stacked" />
              </div>
              <h2 className="font-semibold text-text">Сборок пока нет</h2>
              <p className="mt-1 text-sm text-muted">
                Создайте сборку, выберите ядро и добавьте моды с Modrinth
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {builds.map((b) => (
              <button
                key={b.id}
                onClick={() => openBuild(b.id)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-accent/50"
              >
                <BuildCover build={b} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text">{b.name}</div>
                  <div className="truncate text-xs text-muted">
                    {b.mc_version} · {loaderLabel[b.loader] ?? b.loader}
                  </div>
                  <div className="text-[11px] text-muted">{b.mods.length} модов</div>
                </div>
                <i
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDel(b);
                  }}
                  title="Удалить сборку"
                  className="fa-solid fa-trash-can p-1.5 text-muted opacity-0 transition-opacity hover:text-[#ef4444] group-hover:opacity-100"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {createModal && (
        <CreateBuildModal
          onClose={() => setCreateModal(false)}
          onCreated={() => {
            refresh();
            toast("Сборка создана", "success");
          }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title="Удалить сборку"
          message={`Удалить сборку «${confirmDel.name}» вместе со всеми модами? Это действие нельзя отменить.`}
          onConfirm={confirmDelete}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
