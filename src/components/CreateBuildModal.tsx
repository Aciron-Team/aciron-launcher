import { useEffect, useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import Modal from "./Modal";
import Dropdown from "./Dropdown";
import {
  createBuild,
  listVersions,
  pickFile,
  setBuildImage,
  type Loader,
  type VersionInfo,
} from "../api";

const LOADERS: { id: Loader; label: string; icon: string; desc: string }[] = [
  { id: "fabric", label: "Fabric", icon: "fa-scroll", desc: "Лёгкий, современные версии" },
  { id: "forge", label: "Forge", icon: "fa-hammer", desc: "Классика, много модов" },
  { id: "neoforge", label: "NeoForge", icon: "fa-fire", desc: "Форк Forge, 1.20.1+" },
  { id: "quilt", label: "Quilt", icon: "fa-layer-group", desc: "Совместим с Fabric" },
];

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent";

export default function CreateBuildModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [loader, setLoader] = useState<Loader>("fabric");
  const [version, setVersion] = useState("");
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listVersions()
      .then((v) => {
        setVersions(v);
        const firstRelease = v.find((x) => x.type === "release");
        if (firstRelease) setVersion(firstRelease.id);
      })
      .catch(() => setVersions([]));
  }, []);

  const versionOptions = useMemo(
    () => (versions ?? []).filter((v) => showSnapshots || v.type === "release"),
    [versions, showSnapshots]
  );

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Введите название сборки");
    if (!version) return setError("Выберите версию Minecraft");
    setBusy(true);
    try {
      const build = await createBuild(name.trim(), version, loader);
      if (imagePath) {
        try {
          await setBuildImage(build.id, imagePath);
        } catch {

        }
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const pickImage = async () => {
    const f = await pickFile("Изображение", ["png", "jpg", "jpeg", "webp", "gif"]);
    if (f) setImagePath(f);
  };

  return (
    <Modal title="Новая сборка" icon="fa-cubes-stacked" onClose={onClose}>
      <div className="space-y-4 p-5">
        {}
        <div className="flex gap-4">
          <button
            onClick={pickImage}
            title="Обложка"
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-bg"
          >
            {imagePath ? (
              <img src={convertFileSrc(imagePath)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-muted">
                <i className="fa-solid fa-image text-xl" />
              </span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex flex-col items-center gap-1 text-white">
                <i className="fa-solid fa-camera" />
                <span className="text-[10px] font-medium">Обложка</span>
              </span>
            </span>
          </button>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <label className="mb-1.5 block text-xs text-muted">Название сборки</label>
            <input
              autoFocus
              className={inputCls}
              value={name}
              placeholder="Моя сборка"
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="mt-1.5 text-[11px] text-muted">Обложку можно поменять позже.</p>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs text-muted">Ядро (загрузчик модов)</span>
          <div className="grid grid-cols-2 gap-2">
            {LOADERS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLoader(l.id)}
                className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                  loader === l.id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card hover:border-accent/40"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
                    loader === l.id ? "bg-accent/15 text-accent" : "bg-bg text-muted"
                  }`}
                >
                  <i className={`fa-solid ${l.icon}`} />
                </span>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${loader === l.id ? "text-accent" : "text-text"}`}>
                    {l.label}
                  </div>
                  <div className="truncate text-[11px] text-muted">{l.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs text-muted">Версия Minecraft</span>
            <button
              onClick={() => setShowSnapshots((s) => !s)}
              className={`text-[11px] font-medium transition-colors ${
                showSnapshots ? "text-accent" : "text-muted hover:text-text"
              }`}
            >
              <i className="fa-solid fa-flask mr-1" />
              Снапшоты
            </button>
          </div>
          {versions === null ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-muted">
              <i className="fa-solid fa-spinner fa-spin" />
              Загрузка версий…
            </div>
          ) : (
            <Dropdown
              value={version}
              onChange={setVersion}
              placeholder="Выберите версию"
              options={versionOptions.map((v) => ({
                value: v.id,
                label: v.id + (v.type !== "release" ? ` (${v.type})` : ""),
              }))}
            />
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
            <i className="fa-solid fa-circle-exclamation mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-60"
          >
            {busy && <i className="fa-solid fa-spinner fa-spin" />}
            Создать
          </button>
        </div>
      </div>
    </Modal>
  );
}
