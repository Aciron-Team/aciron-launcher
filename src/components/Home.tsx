import { APP_VERSION, APP_CHANNEL } from "../config";

type News = {
  id: number;
  tag: string;
  title: string;
  date: string;
  text: string;
  icon: string;
};

const NEWS: News[] = [
  {
    id: 1,
    tag: "Обновление",
    title: "Источники загрузки: Modrinth, CurseForge, FTB",
    date: "23 июля 2026",
    text: "Выбирайте, откуда качать моды и сборки. Modrinth уже работает, CurseForge и FTB — на подходе.",
    icon: "fa-cubes-stacked",
  },
  {
    id: 2,
    tag: "Обновление",
    title: "Ресурспаки и шейдеры в сборках",
    date: "23 июля 2026",
    text: "Теперь в сборки можно добавлять не только моды, но и ресурспаки с шейдерами прямо из каталога.",
    icon: "fa-palette",
  },
  {
    id: 3,
    tag: "Обновление",
    title: "Темы оформления",
    date: "23 июля 2026",
    text: "Шесть тем — Midnight, Ocean, Dracula и другие — плюс своя палитра. Настройте лаунчер под себя.",
    icon: "fa-swatchbook",
  },
  {
    id: 4,
    tag: "Новость",
    title: "Скины лицензии — даже на пиратке",
    date: "23 июля 2026",
    text: "Свой встроенный агент подтягивает скины лицензионных аккаунтов Mojang прямо в игру — на версиях от 1.7 до самых новых. Никаких серверов и настроек.",
    icon: "fa-user-astronaut",
  },
];

const tagColor: Record<string, string> = {
  Новость: "var(--color-accent)",
  Обновление: "#60a5fa",
  Сборка: "#4ade80",
};

function WelcomeBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/20 via-card to-card p-7">
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 right-16 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
          <i className="fa-solid fa-sparkles" />
          v{APP_VERSION} {APP_CHANNEL}
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-text">
          Добро пожаловать в <span className="text-gradient">Aciron</span>
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Собирайте свои сборки, ставьте моды, ресурспаки и шейдеры, входите через Microsoft или
          пиратский аккаунт и играйте. Ниже — что нового.
        </p>
      </div>
    </div>
  );
}

function TimelineItem({ n, last }: { n: News; last: boolean }) {
  const color = tagColor[n.tag] ?? "var(--color-muted)";
  return (
    <div className="group relative flex gap-4 pb-5">
      {}
      <div className="relative flex flex-col items-center">
        <span
          className="z-10 grid h-9 w-9 place-items-center rounded-full border-2 bg-bg"
          style={{ borderColor: color, color }}
        >
          <i className={`fa-solid ${n.icon} text-sm`} />
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-border" />}
      </div>
      {}
      <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 transition-colors group-hover:border-accent/40">
        <div className="mb-1 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            {n.tag}
          </span>
          <span className="ml-auto text-[11px] text-muted">{n.date}</span>
        </div>
        <h3 className="font-semibold text-text">{n.title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{n.text}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-6">
        <WelcomeBanner />

        <div className="mb-4 mt-7 flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Что нового</h2>
        </div>

        <div>
          {NEWS.map((n, i) => (
            <TimelineItem key={n.id} n={n} last={i === NEWS.length - 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
