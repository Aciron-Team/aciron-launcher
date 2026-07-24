import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {});

const STYLES: Record<ToastType, { icon: string; color: string }> = {
  success: { icon: "fa-circle-check", color: "text-[#4caf50]" },
  error: { icon: "fa-circle-exclamation", color: "text-[#ef4444]" },
  info: { icon: "fa-circle-info", color: "text-accent" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => {
          const st = STYLES[t.type];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-border bg-panel px-4 py-2.5 text-sm text-text shadow-xl shadow-black/40 animate-[float-in_.2s_ease]"
            >
              <i className={`fa-solid ${st.icon} ${st.color}`} />
              <span className="min-w-0 break-words">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
