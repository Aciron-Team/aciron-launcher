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

export const PRESET_LIST: { id: PresetId; label: string; palette: Palette }[] = [
  {
    id: "standard",
    label: "Classic",
    palette: {
      bg: "#1e1a16",
      panel: "#2a2320",
      card: "#352c27",
      border: "#443a33",
      text: "#ede6df",
      muted: "#a89b8f",
      accent: "#f5a96b",
      accentHover: "#ffbc85",
      accentActive: "#d98f52",
      ctrlHover: "#2f281d",
    },
  },
  {
    id: "dark",
    label: "Midnight",
    palette: {
      bg: "#0e0b14",
      panel: "#171226",
      card: "#1f1830",
      border: "#31283f",
      text: "#ece9f4",
      muted: "#9d94ac",
      accent: "#a855f7",
      accentHover: "#c084fc",
      accentActive: "#8b3ce0",
      ctrlHover: "#1c1630",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    palette: {
      bg: "#0b1622",
      panel: "#12212f",
      card: "#17293a",
      border: "#24384c",
      text: "#e6f0f7",
      muted: "#8ba7bd",
      accent: "#38bdf8",
      accentHover: "#7dd3fc",
      accentActive: "#0ea5e9",
      ctrlHover: "#14283a",
    },
  },
  {
    id: "dracula",
    label: "Dracula",
    palette: {
      bg: "#282a36",
      panel: "#21222c",
      card: "#343746",
      border: "#44475a",
      text: "#f8f8f2",
      muted: "#6272a4",
      accent: "#bd93f9",
      accentHover: "#d6b6ff",
      accentActive: "#a271f0",
      ctrlHover: "#343746",
    },
  },
  {
    id: "forest",
    label: "Forest",
    palette: {
      bg: "#0e1710",
      panel: "#16221a",
      card: "#1d2c22",
      border: "#2c4133",
      text: "#e7f2e9",
      muted: "#93a99a",
      accent: "#4ade80",
      accentHover: "#86efac",
      accentActive: "#22c55e",
      ctrlHover: "#1a2a1f",
    },
  },
  {
    id: "rose",
    label: "Rosé",
    palette: {
      bg: "#1c1419",
      panel: "#271a22",
      card: "#33222c",
      border: "#47313d",
      text: "#f3e6ee",
      muted: "#b697a8",
      accent: "#fb7185",
      accentHover: "#fda4af",
      accentActive: "#e11d48",
      ctrlHover: "#2a1c24",
    },
  },
];

export const PRESETS: Record<PresetId, Palette> = Object.fromEntries(
  PRESET_LIST.map((t) => [t.id, t.palette])
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

export function buildCustom(bg: string, accent: string): Palette {
  const darkBg = luminance(bg) < 0.5;
  const step = darkBg ? 1 : -1;
  return {
    bg,
    panel: shade(bg, step * 0.06),
    card: shade(bg, step * 0.11),
    border: shade(bg, step * 0.2),
    text: darkBg ? "#ece9f1" : "#1a1720",
    muted: darkBg ? shade(bg, 0.45) : shade(bg, -0.4),
    accent,
    accentHover: shade(accent, 0.16),
    accentActive: shade(accent, -0.16),
    ctrlHover: shade(bg, step * 0.09),
  };
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

export type SavedPreset = { id: string; name: string; bg: string; accent: string };

type ThemeState = {
  id: ThemeId;
  customBg: string;
  customAccent: string;
  saved: SavedPreset[];
};

const STORAGE_KEY = "aciron:theme";
const DEFAULT_STATE: ThemeState = {
  id: "standard",
  customBg: "#12131a",
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
  if (s.id === "custom") return buildCustom(s.customBg, s.customAccent);
  return PRESETS[s.id];
}

type Ctx = {
  state: ThemeState;
  palette: Palette;
  saved: SavedPreset[];
  setTheme: (id: ThemeId) => void;
  setCustom: (patch: Partial<Pick<ThemeState, "customBg" | "customAccent">>) => void;
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
          { id: String(Date.now()), name: name.trim(), bg: s.customBg, accent: s.customAccent },
        ],
      })),
    applySaved: (p) =>
      setState((s) => ({ ...s, id: "custom", customBg: p.bg, customAccent: p.accent })),
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
