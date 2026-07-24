import { useState } from "react";

type GameServer = {
  name: string;
  ip: string;
  desc: string;
  wip: boolean;
};

const SERVERS: GameServer[] = [
  {
    name: "Aciron — тестовый сервер",
    ip: "mc.aciron.pro",
    desc: "Официальный тестовый сервер лаунчера. Добавляется в список серверов игры автоматически.",
    wip: true,
  },
];

function ServerCard({ s }: { s: GameServer }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {

    }
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/40">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border bg-bg text-2xl text-accent">
        <i className="fa-solid fa-server" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold text-text">{s.name}</span>
          {s.wip && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              <i className="fa-solid fa-hammer text-[9px]" />
              В разработке
            </span>
          )}
        </div>
        <div className="mt-0.5 line-clamp-1 text-xs text-muted">{s.desc}</div>
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-bg px-2 py-1 font-mono text-xs text-text/80">
          <i className="fa-solid fa-globe text-[10px] text-muted" />
          {s.ip}
        </div>
      </div>
      <button
        onClick={copy}
        title="Скопировать адрес"
        className="flex w-32 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-bold text-text transition-colors hover:border-accent/50 hover:text-accent"
      >
        <i className={`fa-solid ${copied ? "fa-check text-[#22c55e]" : "fa-copy"}`} />
        {copied ? "Скопировано" : "Копировать IP"}
      </button>
    </div>
  );
}

export default function ServersPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-6">
        <div className="mb-4 flex items-center gap-2">
          <i className="fa-solid fa-server text-accent" />
          <h2 className="text-lg font-bold text-text">Сервера</h2>
        </div>

        <div className="grid gap-2.5">
          {SERVERS.map((s) => (
            <ServerCard key={s.ip} s={s} />
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          <i className="fa-solid fa-circle-info mr-1.5 text-accent/70" />
          Тестовый сервер автоматически добавляется в игру (можно отключить в настройках). Сам
          сервер пока в разработке — адрес может быть временно недоступен.
        </p>
      </div>
    </div>
  );
}
