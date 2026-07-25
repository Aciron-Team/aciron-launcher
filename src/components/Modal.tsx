import { useEffect, type ReactNode } from "react";

export default function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  width = "max-w-md",
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {}
      <div className="modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {}
      <div
        className={`modal-panel relative flex max-h-[82vh] w-full ${width} flex-col overflow-hidden rounded-xl border border-border bg-panel shadow-2xl shadow-black/60`}
      >

        <div className="relative flex items-center gap-3 border-b border-border px-5 py-4">
          {icon && (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-accent">
              <i className={`fa-solid ${icon}`} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-bold text-text">{title}</h3>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-card hover:text-[#ef4444]"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
