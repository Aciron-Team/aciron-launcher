import { invoke } from "@tauri-apps/api/core";

export type Settings = {
  java_path: string;
  ram_mb: number;
  window_width: number;
  window_height: number;
  game_dir: string;
  versions_dir: string;
  builds_dir: string;
  username: string;
  hide_on_launch: boolean;
  background_anim: boolean | null;
  discord_rpc: boolean;
  autoadd_server: boolean;
  jvm_args: string;
  auto_update_check: boolean;
  fullscreen: boolean;
};

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const mockSettings: Settings = {
  java_path: "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
  ram_mb: 4096,
  window_width: 854,
  window_height: 480,
  game_dir: "C:\\Users\\you\\AppData\\Roaming\\.acironlauncher",
  versions_dir: "C:\\Users\\you\\AppData\\Roaming\\.acironlauncher\\versions",
  builds_dir: "C:\\Users\\you\\AppData\\Roaming\\.acironlauncher\\builds",
  username: "Player",
  hide_on_launch: false,
  background_anim: null,
  discord_rpc: true,
  autoadd_server: true,
  jvm_args: "",
  auto_update_check: true,
  fullscreen: false,
};

export async function getSettings(): Promise<Settings> {
  if (!isTauri) return { ...mockSettings };
  return invoke<Settings>("get_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!isTauri) return;
  await invoke("save_settings", { settings });
}

export async function defaultSettings(): Promise<Settings> {
  if (!isTauri) return { ...mockSettings };
  return invoke<Settings>("default_settings");
}

export async function detectJava(): Promise<string> {
  if (!isTauri) return mockSettings.java_path;
  return invoke<string>("detect_java");
}

export async function hardwareCapable(): Promise<boolean> {
  if (!isTauri) return true;
  return invoke<boolean>("hardware_capable");
}

export async function pickFolder(defaultPath?: string): Promise<string | null> {
  if (!isTauri) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const res = await open({ directory: true, defaultPath });
  return typeof res === "string" ? res : null;
}

export async function pickFile(
  name: string,
  extensions: string[],
  defaultPath?: string
): Promise<string | null> {
  if (!isTauri) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const res = await open({
    directory: false,
    multiple: false,
    defaultPath,
    filters: [{ name, extensions }],
  });
  return typeof res === "string" ? res : null;
}

export async function openFolder(path: string): Promise<void> {
  if (!isTauri) return;
  await invoke("open_folder", { path });
}

export async function openUrl(url: string): Promise<void> {
  if (!isTauri) {
    window.open(url, "_blank");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}

export type UpdateInfo = {
  available: boolean;
  current: string;
  latest: string;
  url: string;
  notes: string;
};

export async function checkUpdate(): Promise<UpdateInfo> {
  const fallback: UpdateInfo = {
    available: false,
    current: "",
    latest: "",
    url: "",
    notes: "",
  };
  if (!isTauri) return fallback;
  try {
    return await invoke<UpdateInfo>("check_update");
  } catch {
    return fallback;
  }
}

export type ServerStatus = {
  online: boolean;
  players_online: number;
  players_max: number;
  motd: string;
  version: string;
  icon: string;
};

const STATUS_TTL = 60_000;
const statusCache = new Map<string, { at: number; data: ServerStatus }>();

export function cachedServerStatus(address: string): ServerStatus | null {
  return statusCache.get(address)?.data ?? null;
}

export async function serverStatus(address: string, force = false): Promise<ServerStatus> {
  const empty: ServerStatus = {
    online: false,
    players_online: 0,
    players_max: 0,
    motd: "",
    version: "",
    icon: "",
  };
  const cached = statusCache.get(address);
  if (!force && cached && Date.now() - cached.at < STATUS_TTL) return cached.data;
  if (!isTauri) return cached?.data ?? empty;
  try {
    const data = await invoke<ServerStatus>("server_status", { address });
    statusCache.set(address, { at: Date.now(), data });
    return data;
  } catch {

    return cached?.data ?? empty;
  }
}

export type AccountType = "offline" | "microsoft";

export type Account = {
  id: string;
  username: string;
  uuid: string;
  type: AccountType;
  access_token: string;
  skin_url: string;
};

export type AccountsState = { accounts: Account[]; active: string };

const mockAccounts: AccountsState = {
  accounts: [
    { id: "1", username: "Steve", uuid: "", type: "offline", access_token: "0", skin_url: "" },
    { id: "2", username: "Notch", uuid: "", type: "offline", access_token: "0", skin_url: "" },
  ],
  active: "1",
};

export async function getAccounts(): Promise<AccountsState> {
  if (!isTauri) return { ...mockAccounts };
  return invoke<AccountsState>("get_accounts");
}

export async function addOfflineAccount(username: string): Promise<Account> {
  if (!isTauri) {
    return { id: String(Date.now()), username, uuid: "", type: "offline", access_token: "0", skin_url: "" };
  }
  return invoke<Account>("add_offline_account", { username });
}

export async function addMicrosoftAccount(): Promise<Account> {
  if (!isTauri) {
    await new Promise((r) => setTimeout(r, 2500));
    return { id: String(Date.now()), username: "MojangGamer", uuid: "", type: "microsoft", access_token: "mock", skin_url: "" };
  }
  return invoke<Account>("add_microsoft_account");
}

export async function removeAccount(id: string): Promise<void> {
  if (!isTauri) return;
  await invoke("remove_account", { id });
}

export async function setActiveAccount(id: string): Promise<void> {
  if (!isTauri) return;
  await invoke("set_active_account", { id });
}

export type InstalledVersion = { id: string; type: string };

const INSTALLED_KEY = "aciron:installed";

export async function getInstalledVersions(): Promise<InstalledVersion[]> {
  if (!isTauri) {
    try {
      return JSON.parse(localStorage.getItem(INSTALLED_KEY) || "[]");
    } catch {
      return [];
    }
  }
  return invoke<InstalledVersion[]>("get_installed_versions");
}

export async function addInstalledVersion(id: string, type = "release"): Promise<void> {
  if (!isTauri) {
    const list: InstalledVersion[] = JSON.parse(localStorage.getItem(INSTALLED_KEY) || "[]");
    if (!list.some((v) => v.id === id)) {
      list.push({ id, type });
      localStorage.setItem(INSTALLED_KEY, JSON.stringify(list));
    }
    return;
  }
  await invoke("add_installed_version", { id, kind: type });
}

export async function removeInstalledVersion(id: string): Promise<void> {
  if (!isTauri) {
    const list: InstalledVersion[] = JSON.parse(localStorage.getItem(INSTALLED_KEY) || "[]");
    localStorage.setItem(INSTALLED_KEY, JSON.stringify(list.filter((v) => v.id !== id)));
    return;
  }
  await invoke("remove_installed_version", { id });
}

export type VersionInfo = { id: string; type: string; release_time: string };

export async function listVersions(): Promise<VersionInfo[]> {
  if (!isTauri) {

    return [
      { id: "1.21.4", type: "release", release_time: "2024-12-03" },
      { id: "1.21.3", type: "release", release_time: "2024-10-23" },
      { id: "1.20.6", type: "release", release_time: "2024-04-29" },
      { id: "1.20.1", type: "release", release_time: "2023-06-12" },
      { id: "1.19.4", type: "release", release_time: "2023-03-14" },
      { id: "1.18.2", type: "release", release_time: "2022-02-28" },
      { id: "1.16.5", type: "release", release_time: "2021-01-15" },
      { id: "1.12.2", type: "release", release_time: "2017-09-18" },
      { id: "1.8.9", type: "release", release_time: "2015-12-09" },
    ];
  }
  return invoke<VersionInfo[]>("list_versions");
}

export function headSkinUrl(account: Pick<Account, "username" | "skin_url">): string {
  if (account.skin_url) return account.skin_url;
  return `https://mc-heads.net/skin/${encodeURIComponent(account.username)}`;
}

export type Loader = "fabric" | "forge" | "neoforge" | "quilt";

export type ContentKind = "mod" | "resourcepack" | "shader";

export type InstalledMod = {
  project_id: string;
  version_id: string;
  name: string;
  filename: string;
  icon_url: string;
  enabled: boolean;
  kind: ContentKind;
};

export type Build = {
  id: string;
  name: string;
  mc_version: string;
  loader: Loader;
  loader_version: string;
  mods: InstalledMod[];
  created: number;
  dir: string;
  image: string;
  icon_url: string;
  playtime_secs: number;
};

export async function getBuilds(): Promise<Build[]> {
  if (!isTauri) return [];
  return invoke<Build[]>("get_builds");
}

export async function createBuild(name: string, mc_version: string, loader: Loader): Promise<Build> {
  if (!isTauri) {
    return { id: String(Date.now()), name, mc_version, loader, loader_version: "", mods: [], created: Date.now() / 1000, dir: "", image: "", icon_url: "", playtime_secs: 0 };
  }
  return invoke<Build>("create_build", { name, mcVersion: mc_version, loader });
}

export async function setBuildImage(build_id: string, src_path: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("set_build_image", { buildId: build_id, srcPath: src_path });
}

export async function getBuildImage(build_id: string): Promise<string | null> {
  if (!isTauri) return null;
  return invoke<string | null>("get_build_image", { buildId: build_id });
}

export async function changeBuildVersion(build_id: string, mc_version: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("change_build_version", { buildId: build_id, mcVersion: mc_version });
}

export async function renameBuild(build_id: string, name: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("rename_build", { buildId: build_id, name });
}

export async function deleteBuild(id: string): Promise<void> {
  if (!isTauri) return;
  await invoke("delete_build", { id });
}

export async function openBuildFolder(id: string): Promise<void> {
  if (!isTauri) return;
  await invoke("open_build_folder", { id });
}

export async function removeMod(build_id: string, project_id: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("remove_mod", { buildId: build_id, projectId: project_id });
}

export async function toggleMod(build_id: string, project_id: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("toggle_mod", { buildId: build_id, projectId: project_id });
}

export async function refreshBuildContent(build_id: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("refresh_build_content", { buildId: build_id });
}

export type ModHit = {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  categories: string[];
  author: string;
};

export type ModSearch = { hits: ModHit[]; total_hits: number; offset: number; limit: number };

export async function modrinthSearch(
  query: string,
  loader: string,
  game_version: string,
  categories: string[],
  index: string,
  offset: number,
  limit: number,
  project_type = "mod"
): Promise<ModSearch> {
  if (!isTauri) return { hits: [], total_hits: 0, offset: 0, limit };
  return invoke<ModSearch>("modrinth_search", {
    query,
    loader,
    gameVersion: game_version,
    categories,
    index,
    offset,
    limit,
    projectType: project_type,
  });
}

export async function installModpack(project_id: string, version_id?: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("install_modpack", { projectId: project_id, versionId: version_id ?? null });
}

export async function modrinthCategories(): Promise<string[]> {
  if (!isTauri) return ["adventure", "optimization", "utility", "worldgen", "library"];
  return invoke<string[]>("modrinth_categories");
}

export async function modrinthInstall(build_id: string, project_id: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("modrinth_install", { buildId: build_id, projectId: project_id });
}

export type GalleryImage = { url: string; title?: string; description?: string; featured?: boolean };

export type ModProject = {
  title: string;
  slug: string;
  description: string;
  body: string;
  categories: string[];
  downloads: number;
  followers: number;
  icon_url: string;
  gallery: GalleryImage[];
  source_url?: string;
  issues_url?: string;
  wiki_url?: string;
  discord_url?: string;
  website_url?: string;
};

export async function modrinthProject(project_id: string): Promise<ModProject> {
  return invoke<ModProject>("modrinth_project", { projectId: project_id });
}

export type ModVersion = {
  id: string;
  name: string;
  version_number: string;
  version_type: string;
  game_versions: string[];
  loaders: string[];
  date_published: string;
  downloads: number;
};

export async function projectVersions(project_id: string): Promise<ModVersion[]> {
  if (!isTauri) return [];
  return invoke<ModVersion[]>("project_versions", { projectId: project_id });
}

export async function modrinthInstallVersion(
  build_id: string,
  project_id: string,
  version_id: string
): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("modrinth_install_version", {
    buildId: build_id,
    projectId: project_id,
    versionId: version_id,
  });
}

export async function curseforgeSearch(
  query: string,
  loader: string,
  game_version: string,
  categories: string[],
  index: string,
  offset: number,
  limit: number,
  project_type = "mod"
): Promise<ModSearch> {
  if (!isTauri) return { hits: [], total_hits: 0, offset: 0, limit };
  return invoke<ModSearch>("curseforge_search", {
    query,
    loader,
    gameVersion: game_version,
    categories,
    index,
    offset,
    limit,
    projectType: project_type,
  });
}

export async function curseforgeCategories(): Promise<string[]> {
  if (!isTauri) return [];
  return invoke<string[]>("curseforge_categories");
}

export async function curseforgeInstall(build_id: string, project_id: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("curseforge_install", { buildId: build_id, projectId: project_id });
}

export async function curseforgeProject(project_id: string): Promise<ModProject> {
  return invoke<ModProject>("curseforge_project", { projectId: project_id });
}

export async function curseforgeProjectVersions(project_id: string): Promise<ModVersion[]> {
  if (!isTauri) return [];
  return invoke<ModVersion[]>("curseforge_project_versions", { projectId: project_id });
}

export async function curseforgeInstallVersion(
  build_id: string,
  project_id: string,
  version_id: string
): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("curseforge_install_version", {
    buildId: build_id,
    projectId: project_id,
    versionId: version_id,
  });
}

export async function curseforgeInstallModpack(project_id: string, version_id?: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("curseforge_install_modpack", {
    projectId: project_id,
    versionId: version_id ?? null,
  });
}

export async function ftbSearch(query: string, offset: number, limit: number): Promise<ModSearch> {
  if (!isTauri) return { hits: [], total_hits: 0, offset: 0, limit };
  return invoke<ModSearch>("ftb_search", { query, offset, limit });
}

export async function ftbProject(project_id: string): Promise<ModProject> {
  return invoke<ModProject>("ftb_project", { projectId: project_id });
}

export async function ftbProjectVersions(project_id: string): Promise<ModVersion[]> {
  if (!isTauri) return [];
  return invoke<ModVersion[]>("ftb_project_versions", { projectId: project_id });
}

export async function ftbInstallModpack(project_id: string, version_id?: string): Promise<Build> {
  if (!isTauri) throw new Error("нет бэкенда");
  return invoke<Build>("ftb_install_modpack", {
    projectId: project_id,
    versionId: version_id ?? null,
  });
}

export type SourceId = "modrinth" | "curseforge" | "ftb";

export function searchContent(
  source: SourceId,
  query: string,
  loader: string,
  game_version: string,
  categories: string[],
  index: string,
  offset: number,
  limit: number,
  project_type = "mod"
): Promise<ModSearch> {
  if (source === "ftb") return ftbSearch(query, offset, limit);
  return source === "curseforge"
    ? curseforgeSearch(query, loader, game_version, categories, index, offset, limit, project_type)
    : modrinthSearch(query, loader, game_version, categories, index, offset, limit, project_type);
}

export function contentCategories(source: SourceId): Promise<string[]> {
  return source === "curseforge" ? curseforgeCategories() : modrinthCategories();
}

export function installContent(source: SourceId, build_id: string, project_id: string): Promise<Build> {
  return source === "curseforge"
    ? curseforgeInstall(build_id, project_id)
    : modrinthInstall(build_id, project_id);
}

export function contentProject(source: SourceId, project_id: string): Promise<ModProject> {
  if (source === "ftb") return ftbProject(project_id);
  return source === "curseforge" ? curseforgeProject(project_id) : modrinthProject(project_id);
}

export function contentVersions(source: SourceId, project_id: string): Promise<ModVersion[]> {
  if (source === "ftb") return ftbProjectVersions(project_id);
  return source === "curseforge" ? curseforgeProjectVersions(project_id) : projectVersions(project_id);
}

export function installModpackContent(
  source: SourceId,
  project_id: string,
  version_id?: string
): Promise<Build> {
  if (source === "ftb") return ftbInstallModpack(project_id, version_id);
  return source === "curseforge"
    ? curseforgeInstallModpack(project_id, version_id)
    : installModpack(project_id, version_id);
}

export function installContentVersion(
  source: SourceId,
  build_id: string,
  project_id: string,
  version_id: string
): Promise<Build> {
  return source === "curseforge"
    ? curseforgeInstallVersion(build_id, project_id, version_id)
    : modrinthInstallVersion(build_id, project_id, version_id);
}
