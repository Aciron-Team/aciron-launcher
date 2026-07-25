import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type DropdownOption = { value: string; label: string; icon?: string };

type Pos = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width: number;
  maxH: number;
  up: boolean;
};

export default function Dropdown({
  value,
  options,
  onChange,
  className = "",
  placeholder = "Выбрать",
  disabled = false,
  align = "left",
}: {
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  const cur = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const b = btnRef.current?.getBoundingClientRect();
      if (!b) return;
      const wanted = Math.min(288, options.length * 40 + 8);
      const below = window.innerHeight - b.bottom - 8;
      const above = b.top - 8;

      const up = below < wanted && above > below;
      const maxH = Math.min(wanted, up ? above : below);
      setPos({
        ...(up ? { bottom: window.innerHeight - b.top + 6 } : { top: b.bottom + 6 }),
        ...(align === "right" ? { right: window.innerWidth - b.right } : { left: b.left }),
        width: b.width,
        maxH,
        up,
      });
    };
    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, options.length, align]);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent/50 disabled:opacity-50"
      >
        {cur?.icon && <i className={`fa-solid ${cur.icon} text-xs text-muted`} />}
        <span className="flex-1 truncate text-left">{cur?.label ?? placeholder}</span>
        <i
          className={`fa-solid fa-chevron-down text-[10px] text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <div
              className="modal-panel fixed z-[9999] overflow-y-auto rounded-xl border border-border bg-panel py-1 shadow-xl shadow-black/50"
              style={(() => {

                const s = (window as unknown as { __acironScale?: number }).__acironScale || 1;
                return {
                  top: pos.top,
                  bottom: pos.bottom,
                  left: pos.left,
                  right: pos.right,
                  minWidth: pos.width / s,
                  maxHeight: pos.maxH / s,
                  transform: `scale(${s})`,
                  transformOrigin: `${pos.up ? "bottom" : "top"} ${align === "right" ? "right" : "left"}`,
                };
              })()}
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-card ${
                    o.value === value ? "text-accent" : "text-text"
                  }`}
                >
                  {o.icon && <i className={`fa-solid ${o.icon} w-4 text-center text-xs`} />}
                  <span className="flex-1 truncate pr-2">{o.label}</span>
                  {o.value === value && <i className="fa-solid fa-check text-xs text-accent" />}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
