import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TitleBar from "./components/TitleBar";
import ResizeHandles from "./components/ResizeHandles";
import DownloadOrb from "./components/DownloadOrb";
import Sidebar, { type NavId } from "./components/Sidebar";
import PlayBar from "./components/PlayBar";
import DownloadBar from "./components/DownloadBar";
import Home from "./components/Home";
import BuildsPage from "./components/BuildsPage";
import FriendsPage from "./components/FriendsPage";
import ServersPage from "./components/ServersPage";
import SettingsPage from "./components/SettingsPage";
import BackgroundCubes from "./components/BackgroundCubes";
import { DEV } from "./config";
import { LauncherProvider } from "./LauncherContext";
import { ToastProvider } from "./ToastContext";
import { ThemeProvider } from "./ThemeContext";
import { getSettings, hardwareCapable } from "./api";

const BASE_W = 1000;

const MAX_SCALE = 1.35;

function AppInner() {
  const [active, setActive] = useState<NavId>("home");
  const [anim, setAnim] = useState(false);
  const scaleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (DEV) return;
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  useLayoutEffect(() => {
    const el = scaleRef.current;
    if (!el) return;
    el.style.transformOrigin = "top left";

    const layout = (maximized: boolean) => {
      const cw = document.documentElement.clientWidth;
      const ch = document.documentElement.clientHeight;

      const border = maximized
        ? Math.max(0, Math.round((cw - (window.screen.availWidth || cw)) / 2))
        : 0;
      const visW = cw - 2 * border;
      const visH = ch - 2 * border;

      const s = Math.min(visW / BASE_W, MAX_SCALE);
      el.style.width = `${visW / s}px`;
      el.style.height = `${visH / s}px`;
      el.style.transform = `translate(${border}px, ${border}px) scale(${s})`;
      (window as unknown as { __acironScale: number }).__acironScale = s;
      document.documentElement.classList.toggle("win-maximized", maximized);
    };

    layout(false);

    let win: {
      isMaximized: () => Promise<boolean>;
      onResized: (cb: () => void) => Promise<() => void>;
    } | null = null;
    let un: (() => void) | undefined;
    const apply = async () => {
      let m = false;
      if (win) {
        try {
          m = await win.isMaximized();
        } catch {

        }
      }
      layout(m);
    };
    const onR = () => void apply();
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        win = getCurrentWindow();
        un = await win.onResized(onR);
      } catch {

      }
      apply();
    })();
    window.addEventListener("resize", onR);
    return () => {
      window.removeEventListener("resize", onR);
      un?.();
    };
  }, []);

  useEffect(() => {
    getSettings().then(async (s) => {
      setAnim(s.background_anim ?? (await hardwareCapable()));
    });
  }, [active]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg text-text">
      {anim && <BackgroundCubes />}
      <ResizeHandles />
      {}
      <div ref={scaleRef} className="absolute left-0 top-0">
        <DownloadOrb />
        <div className="relative z-10 flex h-full w-full flex-col">
          <TitleBar />
          <div className="flex min-h-0 flex-1">
            <Sidebar active={active} onSelect={setActive} />
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="min-h-0 flex-1 overflow-hidden">
                {active === "home" && <Home />}
                {active === "builds" && <BuildsPage />}
                {active === "friends" && <FriendsPage />}
                {active === "servers" && <ServersPage />}
                {active === "settings" && <SettingsPage />}
              </main>
              {active !== "settings" && (
                <>
                  <DownloadBar />
                  <PlayBar />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LauncherProvider>
          <AppInner />
        </LauncherProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
