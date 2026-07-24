import { openUrl } from "../api";
import { GITHUB_URL } from "../config";

export type NavId = "home" | "builds" | "friends" | "settings" | "servers";

const topItems: { id: NavId; label: string; icon: string }[] = [
  { id: "home", label: "Главная", icon: "fa-house" },
  { id: "builds", label: "Сборки", icon: "fa-cubes" },
  { id: "friends", label: "Друзья", icon: "fa-user-group" },
  { id: "servers", label: "Сервера", icon: "fa-server" },
];

export default function Sidebar({
  active,
  onSelect,
}: {
  active: NavId;
  onSelect: (id: NavId) => void;
}) {
  const Item = ({ id, label, icon }: { id: NavId; label: string; icon: string }) => {
    const isActive = active === id;
    return (
      <button
        onClick={() => onSelect(id)}
        title={label}
        className={[
          "relative flex h-12 w-full items-center justify-center transition-colors",
          isActive ? "text-accent" : "text-muted hover:text-text",
          "hover:bg-card rounded-[4px]",
        ].join(" ")}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
        )}
        <i className={`fa-solid ${icon} text-[18px]`} />
      </button>
    );
  };

  return (
    <aside className="flex w-14 shrink-0 flex-col bg-panel">
      <nav className="flex flex-col pt-2">
        {topItems.map((i) => (
          <Item key={i.id} {...i} />
        ))}
      </nav>

      <div className="mt-auto pb-2">
          <button
            aria-label="GitHub"
            title="Открыть на GitHub"
            onClick={() => openUrl(GITHUB_URL)}
            className="grid w-full h-14 place-items-center text-muted transition-colors hover:bg-ctrl-hover rounded-[8px] hover:text-text">
            <i className="fa-brands fa-github text-xl"></i>
          </button>
        <Item id="settings" label="Настройка лаунчера" icon="fa-gear" />
      </div>
    </aside>
  );
}
