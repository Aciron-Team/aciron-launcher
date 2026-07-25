import { useEffect, useState } from "react";
import { serverStatus, cachedServerStatus, type ServerStatus } from "../api";
import { useLauncherCtx } from "../LauncherContext";
import { useToast } from "../ToastContext";

type GameServer = {
  name: string;
  ip: string;
  version: string;
  desc?: string;
};

const SERVERS: GameServer[] = [

];

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function ServerCard({ s }: { s: GameServer }) {

  const [st, setSt] = useState<ServerStatus | null>(() => cachedServerStatus(s.ip));
  const [loading, setLoading] = useState(() => cachedServerStatus(s.ip) === null);
  const [copied, setCopied] = useState(false);
  const { launch, status, gameRunning } = useLauncherCtx();
  const toast = useToast();

  const busy = status === "running" || gameRunning;

  useEffect(() => {
    let alive = true;
    if (!cachedServerStatus(s.ip)) setLoading(true);

    serverStatus(s.ip)
      .then((r) => alive && setSt(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [s.ip]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {

    }
  };

  const connect = () => {
    if (busy) return;
    launch(s.version, s.ip);
    toast(`Запуск ${s.version} и подключение к ${s.name}…`, "success");
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/40">
      {}
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-bg text-2xl text-accent">
        {st?.icon ? (
          <img src={st.icon} alt="" className="h-full w-full object-cover" />
        ) : (
          <i className="fa-solid fa-server" />
        )}
      </div>

      {}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-bold text-text">{s.name}</span>
          {}
          {loading ? (
            <span className="text-[11px] text-muted">
              <i className="fa-solid fa-spinner fa-spin mr-1" />
              проверка…
            </span>
          ) : st?.online ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#22c55e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
              {fmt(st.players_online)} / {fmt(st.players_max)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-muted" />
              оффлайн
            </span>
          )}
        </div>

        {}
        <div className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted">
          {st?.motd || s.desc || ""}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={copy}
            title="Скопировать адрес"
            className="inline-flex items-center gap-1.5 rounded-md bg-bg px-2 py-1 font-mono text-xs text-text/80 transition-colors hover:text-accent"
          >
            <i className={`fa-solid ${copied ? "fa-check text-[#22c55e]" : "fa-globe text-muted"} text-[10px]`} />
            {s.ip}
          </button>
        </div>
      </div>

      {}
      <button
        onClick={connect}
        disabled={busy}
        title={`Запустить ${s.version} и зайти на сервер`}
        className="flex w-36 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
      >
        <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-play"}`} />
        {busy ? "Запуск…" : "Подключиться"}
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
      </div>
    </div>
  );
}
