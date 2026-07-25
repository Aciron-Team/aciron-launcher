import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import BuildCover from "./BuildCover";
import Dropdown from "./Dropdown";
import {
  listVersions,
  changeBuildVersion,
  renameBuild,
  setBuildImage,
  pickFile,
  type Build,
  type VersionInfo,
} from "../api";
import { useToast } from "../ToastContext";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-accent";

const loaderLabel: Record<string, string> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
};

export default function BuildSettingsModal({
  build,
  onClose,
  onUpdated,
}: {
  build: Build;
  onClose: () => void;
  onUpdated: (b: Build) => void;
}) {
  const [versions, setVersions] = useState<VersionInfo[] | null>(null);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [version, setVersion] = useState(build.mc_version);
  const [name, setName] = useState(build.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    listVersions()
      .then(setVersions)
      .catch(() => setVersions([]));
  }, []);

  const options = useMemo(() => {
    const list = (versions ?? []).filter((v) => showSnapshots || v.type === "release");
    if (!list.some((v) => v.id === build.mc_version)) {
      list.unshift({ id: build.mc_version, type: "release", release_time: "" });
    }
    return list;
  }, [versions, showSnapshots, build.mc_version]);

  const changeCover = async () => {
    const f = await pickFile("Изображение", ["png", "jpg", "jpeg", "webp", "gif"]);
    if (!f) return;
    try {
      const updated = await setBuildImage(build.id, f);
      onUpdated(updated);
      toast("Обложка обновлена", "success");
    } catch (e) {
      toast(String(e), "error");
    }
  };

  const nameChanged = name.trim() !== "" && name.trim() !== build.name;
  const versionChanged = version !== build.mc_version;

  const apply = async () => {
    setError("");
    if (!nameChanged && !versionChanged) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      if (nameChanged) {
        const upd = await renameBuild(build.id, name.trim());
        onUpdated(upd);
      }
      if (versionChanged) {
        const upd = await changeBuildVersion(build.id, version);
        onUpdated(upd);
        const off = upd.mods.filter((m) => !m.enabled).length;
        toast(
          `Версия изменена на ${version}` +
            (off ? ` · ${off} мод(ов) выключено (нет под эту версию)` : ""),
          "success"
        );
      } else if (nameChanged) {
        toast("Сохранено", "success");
      }
      onClose();
    } catch (e) {
      setError(String(e));
      toast(String(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Настройка сборки"
      subtitle={`${loaderLabel[build.loader] ?? build.loader} · ядро менять нельзя`}
      icon="fa-gear"
      onClose={onClose}
    >
      <div className="space-y-5 p-5">
        {}
        <div className="flex gap-4">
          <button
            onClick={changeCover}
            title="Изменить обложку"
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border"
          >
            <BuildCover build={build} className="h-24 w-24" />
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              maxLength={60}
              placeholder="Моя сборка"
              className={inputCls}
            />
            <p className="mt-1.5 text-[11px] text-muted">Папка сборки на диске не изменится.</p>
          </div>
        </div>

        {}
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
              options={options.map((v) => ({
                value: v.id,
                label: v.id + (v.type !== "release" ? ` (${v.type})` : ""),
              }))}
            />
          )}
          {versionChanged && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
              <i className="fa-solid fa-circle-info mt-0.5 text-accent" />
              Моды будут пере-подобраны под {version}; те, которых под неё нет, — выключены.
            </p>
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
            Закрыть
          </button>
          <button
            onClick={apply}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-60"
          >
            {busy && <i className="fa-solid fa-spinner fa-spin" />}
            {busy ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
