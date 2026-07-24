import { useState } from "react";
import Modal from "./Modal";
import VersionList from "./VersionList";
import { installModpack, type ModHit, type ModVersion } from "../api";
import { useToast } from "../ToastContext";

export default function VersionPickerModal({
  pack,
  onClose,
  onInstalled,
}: {
  pack: ModHit;
  onClose: () => void;
  onInstalled: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const pick = async (v: ModVersion) => {
    if (busy) return;
    setBusy(v.id);
    try {
      await installModpack(pack.project_id, v.id);
      toast(`Сборка «${pack.title}» (${v.version_number}) установлена`, "success");
      onInstalled();
      onClose();
    } catch (e) {
      toast(String(e), "error");
      setBusy(null);
    }
  };

  return (
    <Modal title={`Версии сборки — ${pack.title}`} icon="fa-layer-group" onClose={onClose}>
      <div className="max-h-[60vh] overflow-y-auto p-4">
        <p className="mb-3 text-xs text-muted">
          Выберите версию — она установится как отдельная сборка.
        </p>
        <VersionList projectId={pack.project_id} actionLabel="Скачать" busyId={busy} onPick={pick} />
      </div>
    </Modal>
  );
}
