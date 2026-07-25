import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GalleryImage } from "../api";

export default function Lightbox({
  images,
  index,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);

  useEffect(() => setI(index), [index]);

  useEffect(() => {
    let prev = false;
    let win: { setFullscreen: (b: boolean) => Promise<void>; isFullscreen: () => Promise<boolean> } | null =
      null;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        win = getCurrentWindow();
        prev = await win.isFullscreen();
        await win.setFullscreen(true);
      } catch {

      }
    })();
    return () => {
      win?.setFullscreen(prev).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const prev = () => setI((v) => (v - 1 + images.length) % images.length);
    const next = () => setI((v) => (v + 1) % images.length);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  const go = (d: number) => setI((v) => (v + d + images.length) % images.length);
  const cur = images[i];
  if (!cur) return null;

  const arrowCls =
    "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/40 text-white/90 opacity-0 backdrop-blur-sm transition-all hover:bg-black/70 group-hover:opacity-100";

  return createPortal(
    <div
      className="modal-backdrop group fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md"
      onClick={onClose}
    >
      {}
      <button
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <i className="fa-solid fa-xmark text-lg" />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="Предыдущая"
          className={`${arrowCls} left-4`}
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
      )}

      <img
        key={i}
        src={cur.url}
        alt={cur.title ?? ""}
        onClick={(e) => e.stopPropagation()}
        className="lightbox-img max-h-[96vh] max-w-[98vw] rounded-2xl border border-white/10 object-contain shadow-2xl shadow-black/60"
      />

      {}
      {(cur.title || images.length > 1) && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80 backdrop-blur-sm">
          {cur.title && <span className="max-w-[60vw] truncate">{cur.title}</span>}
          {images.length > 1 && (
            <span className="tabular-nums">
              {i + 1} / {images.length}
            </span>
          )}
        </div>
      )}

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="Следующая"
          className={`${arrowCls} right-4`}
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      )}
    </div>,
    document.body
  );
}
