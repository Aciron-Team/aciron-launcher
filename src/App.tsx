import { useEffect, useState } from "react";
import TitleBar from "./components/TitleBar";
import Sidebar, { type NavId } from "./components/Sidebar";
import PlayBar from "./components/PlayBar";
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

function AppInner() {
  const [active, setActive] = useState<NavId>("home");
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    if (DEV) return;
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  useEffect(() => {
    getSettings().then(async (s) => {
      setAnim(s.background_anim ?? (await hardwareCapable()));
    });
  }, [active]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-bg text-text">
      {anim && <BackgroundCubes />}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
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
            {active !== "settings" && <PlayBar />}
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
