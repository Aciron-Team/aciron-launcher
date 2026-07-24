import { useEffect, type ReactNode } from "react";

export default function Modal({
  title,
  icon,
  onClose,
  children,
  width = "max-w-md",
}: {
  title: string;
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {}
      <div
        className={`relative flex max-h-[80vh] w-full ${width} animate-[float-in_.2s_ease] flex-col overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/50`}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
          {icon && <i className={`fa-solid ${icon} text-accent`} />}
          <h3 className="font-bold text-text">{title}</h3>
          <button
            onClick={onClose}
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-card hover:text-[#ef4444]"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
