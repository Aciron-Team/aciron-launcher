import { useState } from "react";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import SettingsPage from "./SettingsPage";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const tryClose = () => (dirty ? setConfirm(true) : onClose());

  return (
    <>
      <Modal
        title="Настройки"
        icon="fa-gear"
        width="max-w-4xl"
        bare
        onClose={tryClose}
      >
        <div className="h-[68vh] min-h-[420px]">
          <SettingsPage onDirtyChange={setDirty} />
        </div>
      </Modal>

      {confirm && (
        <ConfirmModal
          title="Несохранённые изменения"
          message="Вы изменили настройки, но не сохранили их. Закрыть без сохранения?"
          confirmLabel="Закрыть без сохранения"
          confirmIcon="fa-arrow-right-from-bracket"
          danger={false}
          onConfirm={onClose}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  );
}
