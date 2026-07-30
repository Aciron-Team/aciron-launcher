import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Palette = {
  bg: string;
  panel: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  ctrlHover: string;
};

export type PresetId =
  | "standard"
  | "dark"
  | "ocean"
  | "dracula"
  | "forest"
  | "rose";
export type ThemeId = PresetId | "custom";

export const PRESET_LIST: { id: PresetId; label: string; accent: string; accentHover: string; accentActive: string }[] = [
  { id: "standard", label: "Aciron", accent: "#f5a96b", accentHover: "#ffbc85", accentActive: "#d98f52" },
  { id: "dark", label: "Amethyst", accent: "#a855f7", accentHover: "#c084fc", accentActive: "#8b3ce0" },
  { id: "ocean", label: "Ocean", accent: "#38bdf8", accentHover: "#7dd3fc", accentActive: "#0ea5e9" },
  { id: "dracula", label: "Dracula", accent: "#bd93f9", accentHover: "#d6b6ff", accentActive: "#a271f0" },
  { id: "forest", label: "Forest", accent: "#4ade80", accentHover: "#86efac", accentActive: "#22c55e" },
  { id: "rose", label: "Rosé", accent: "#fb7185", accentHover: "#fda4af", accentActive: "#e11d48" },
];

export const SURFACE = {
  bg: "#131315",
  panel: "#1c1c1f",
  card: "#232327",
  border: "#2e2e33",
  ctrlHover: "#232327",
} as const;

const TEXT = { text: "#d9d9d9", muted: "#818181" };

function paletteOfAccent(accent: string, hover: string, active: string): Palette {
  return {
    ...SURFACE,
    ...TEXT,
    accent,
    accentHover: hover,
    accentActive: active,
  };
}

export const PRESETS: Record<PresetId, Palette> = Object.fromEntries(
  PRESET_LIST.map((t) => [t.id, paletteOfAccent(t.accent, t.accentHover, t.accentActive)])
) as Record<PresetId, Palette>;

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("");
}

function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = t >= 0 ? 255 : 0;
  const k = Math.abs(t);
  return rgbToHex(r + (target - r) * k, g + (target - g) * k, b + (target - b) * k);
}
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function buildCustom(accent: string): Palette {
  return paletteOfAccent(accent, shade(accent, 0.16), shade(accent, -0.16));
}

function applyPalette(p: Palette) {
  const root = document.documentElement;
  const map: Record<string, string> = {
    "--color-bg": p.bg,
    "--color-panel": p.panel,
    "--color-card": p.card,
    "--color-border": p.border,
    "--color-text": p.text,
    "--color-muted": p.muted,
    "--color-accent": p.accent,
    "--color-accent-hover": p.accentHover,
    "--color-accent-active": p.accentActive,
    "--color-ctrl-hover": p.ctrlHover,
  };
  for (const [k, v] of Object.entries(map)) root.style.setProperty(k, v);
  root.style.colorScheme = luminance(p.bg) < 0.5 ? "dark" : "light";
}

export type SavedPreset = { id: string; name: string; accent: string };

type ThemeState = {
  id: ThemeId;
  customAccent: string;
  saved: SavedPreset[];
};

const STORAGE_KEY = "aciron:theme";
const DEFAULT_STATE: ThemeState = {
  id: "standard",
  customAccent: "#6366f1",
  saved: [],
};

function load(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {

  }
  return DEFAULT_STATE;
}

export function paletteOf(s: ThemeState): Palette {
  return s.id === "custom" ? buildCustom(s.customAccent) : PRESETS[s.id];
}

type Ctx = {
  state: ThemeState;
  palette: Palette;
  saved: SavedPreset[];
  setTheme: (id: ThemeId) => void;
  setCustom: (patch: Partial<Pick<ThemeState, "customAccent">>) => void;
  savePreset: (name: string) => void;
  applySaved: (p: SavedPreset) => void;
  deleteSaved: (id: string) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(load);

  const palette = useMemo(() => paletteOf(state), [state]);

  useEffect(() => {
    applyPalette(palette);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [palette, state]);

  const value: Ctx = {
    state,
    palette,
    saved: state.saved,
    setTheme: (id) => setState((s) => ({ ...s, id })),
    setCustom: (patch) => setState((s) => ({ ...s, id: "custom", ...patch })),
    savePreset: (name) =>
      setState((s) => ({
        ...s,
        saved: [
          ...s.saved,
          { id: String(Date.now()), name: name.trim(), accent: s.customAccent },
        ],
      })),
    applySaved: (p) =>
      setState((s) => ({ ...s, id: "custom", customAccent: p.accent })),
    deleteSaved: (id) => setState((s) => ({ ...s, saved: s.saved.filter((p) => p.id !== id) })),
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Ctx {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}

export function initThemeEarly() {
  applyPalette(paletteOf(load()));
}
