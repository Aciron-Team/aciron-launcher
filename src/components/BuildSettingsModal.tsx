import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import {
  listVersions,
  changeBuildVersion,
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

  const apply = async () => {
    setError("");
    if (version === build.mc_version) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      const updated = await changeBuildVersion(build.id, version);
      onUpdated(updated);
      const off = updated.mods.filter((m) => !m.enabled).length;
      toast(
        `Версия изменена на ${version}` +
          (off ? ` · ${off} мод(ов) выключено (нет под эту версию)` : ""),
        "success"
      );
      onClose();
    } catch (e) {
      setError(String(e));
      toast(String(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Настройка сборки" icon="fa-gear" onClose={onClose}>
      <div className="space-y-4 p-5">
        <div className="text-xs text-muted">
          Ядро: <span className="text-text">{loaderLabel[build.loader] ?? build.loader}</span>{" "}
          (менять нельзя)
        </div>

        {}
        <div>
          <span className="mb-1.5 block text-xs text-muted">Обложка</span>
          <button
            onClick={changeCover}
            className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text transition-colors hover:border-accent/50"
          >
            <i className="fa-solid fa-image text-muted" />
            {build.image ? "Изменить обложку" : "Поставить обложку"}
          </button>
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
            <select value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls}>
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}
                  {v.type !== "release" ? ` (${v.type})` : ""}
                </option>
              ))}
            </select>
          )}
          {version !== build.mc_version && (
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
            {busy ? "Обновление модов…" : "Применить"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
