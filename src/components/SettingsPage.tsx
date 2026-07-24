import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  type Settings,
  getSettings,
  saveSettings,
  defaultSettings,
  detectJava,
  pickFolder,
  pickFile,
  openFolder,
  hardwareCapable,
} from "../api";
import {
  useTheme,
  PRESET_LIST,
  buildCustom,
  type Palette,
} from "../ThemeContext";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent";

const iconBtnCls =
  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted transition-colors hover:border-accent/50 hover:text-accent";

type CatId = "theme" | "java" | "game" | "behavior" | "folders";

const CATS: { id: CatId; label: string; icon: string }[] = [
  { id: "theme", label: "Тема", icon: "fa-palette" },
  { id: "java", label: "Java", icon: "fa-mug-hot" },
  { id: "game", label: "Игра", icon: "fa-gamepad" },
  { id: "behavior", label: "Поведение", icon: "fa-sliders" },
  { id: "folders", label: "Папки", icon: "fa-folder-tree" },
];

function Field({
  label,
  hint,
  children,
  column,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  column?: boolean;
}) {
  return (
    <div className={`px-4 py-3.5 ${column ? "" : "flex items-center gap-4"}`}>
      {label && (
        <div className={`min-w-0 ${column ? "mb-2" : "flex-1"}`}>
          <div className="text-sm font-medium text-text">{label}</div>
          {hint && <div className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</div>}
        </div>
      )}
      <div className={column ? "" : "shrink-0"}>{children}</div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-panel/40">
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        value ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          value ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function PathRow({
  value,
  onPick,
  onOpen,
}: {
  value: string;
  onPick: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input className={inputCls} value={value} readOnly />
      <button className={iconBtnCls} title="Выбрать папку" onClick={onPick}>
        <i className="fa-solid fa-folder-open text-sm" />
      </button>
      <button className={iconBtnCls} title="Открыть папку" onClick={onOpen}>
        <i className="fa-solid fa-up-right-from-square text-sm" />
      </button>
    </div>
  );
}

function ThemeCard({
  label,
  palette,
  active,
  onClick,
}: {
  label: string;
  palette: Palette;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all ${
        active ? "border-accent ring-1 ring-accent" : "border-border hover:border-accent/40"
      }`}
    >
      <div
        className="relative grid h-14 w-full place-items-center overflow-hidden rounded-lg"
        style={{ background: palette.bg }}
      >
        <div className="absolute left-1.5 top-1.5 h-4 w-8 rounded" style={{ background: palette.card }} />
        <div
          className="rounded-md px-2.5 py-1 text-[11px] font-bold"
          style={{ background: palette.accent, color: palette.bg }}
        >
          Aa
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${active ? "text-accent" : "text-text"}`}>
          {label}
        </span>
        {active && <i className="fa-solid fa-circle-check text-xs text-accent" />}
      </div>
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
      />
      <div className="min-w-0">
        <div className="text-sm text-text">{label}</div>
        <div className="text-[11px] uppercase text-muted">{value}</div>
      </div>
    </label>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(true);
  const [hwCap, setHwCap] = useState(true);
  const [cat, setCat] = useState<CatId>("theme");
  const { state: theme, setTheme, setCustom } = useTheme();

  useEffect(() => {
    getSettings().then(setS);
    hardwareCapable().then(setHwCap);
  }, []);

  if (!s) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <i className="fa-solid fa-spinner fa-spin text-2xl" />
      </div>
    );
  }

  const update = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    setSaved(false);
  };

  const onSave = async () => {
    await saveSettings(s);
    setSaved(true);
  };
  const onReset = async () => {
    const def = await defaultSettings();
    setS(def);
    setSaved(false);
  };
  const onDetectJava = async () => {
    const j = await detectJava();
    if (j) update({ java_path: j });
  };
  const browseJava = async () => {
    const f = await pickFile("Java", ["exe"], s.java_path);
    if (f) update({ java_path: f });
  };
  const pick = async (key: keyof Settings) => {
    const dir = await pickFolder(String(s[key]));
    if (dir) update({ [key]: dir } as Partial<Settings>);
  };

  const ramGb = (s.ram_mb / 1024).toFixed(1);
  const customPalette = buildCustom(theme.customBg, theme.customAccent);

  return (
    <div className="flex h-full min-h-0">
      {}
      <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-panel/30 p-3">
        <div className="mb-1 px-2 text-[15px] font-bold text-text">Настройки</div>
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              cat === c.id ? "bg-accent/15 text-accent" : "text-muted hover:bg-card hover:text-text"
            }`}
          >
            <i className={`fa-solid ${c.icon} w-4 text-center`} />
            {c.label}
          </button>
        ))}
        <div className="mt-auto space-y-1 pt-3">
          <button
            onClick={onReset}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-text"
          >
            <i className="fa-solid fa-arrow-rotate-left w-4 text-center" />
            Сбросить
          </button>
        </div>
      </nav>

      {}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-5 px-6 py-6">
            {cat === "theme" && (
              <>
                <h2 className="text-lg font-bold text-text">Тема оформления</h2>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_LIST.map((t) => (
                    <ThemeCard
                      key={t.id}
                      label={t.label}
                      palette={t.palette}
                      active={theme.id === t.id}
                      onClick={() => setTheme(t.id)}
                    />
                  ))}
                  <ThemeCard
                    label="Custom"
                    palette={customPalette}
                    active={theme.id === "custom"}
                    onClick={() => setTheme("custom")}
                  />
                </div>
                {theme.id === "custom" && (
                  <Card>
                    <div className="flex flex-wrap items-center gap-6 px-4 py-4">
                      <ColorField
                        label="Фон"
                        value={theme.customBg}
                        onChange={(v) => setCustom({ customBg: v })}
                      />
                      <ColorField
                        label="Акцент"
                        value={theme.customAccent}
                        onChange={(v) => setCustom({ customAccent: v })}
                      />
                      <span className="text-[11px] text-muted">
                        Остальные оттенки подбираются автоматически
                      </span>
                    </div>
                  </Card>
                )}
              </>
            )}

            {cat === "java" && (
              <>
                <h2 className="text-lg font-bold text-text">Java</h2>
                <Card>
                  <Field column>
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        value={s.java_path}
                        placeholder="Путь к java.exe"
                        onChange={(e) => update({ java_path: e.target.value })}
                      />
                      <button className={iconBtnCls} title="Обзор" onClick={browseJava}>
                        <i className="fa-solid fa-folder-open text-sm" />
                      </button>
                      <button
                        className={iconBtnCls}
                        title="Определить автоматически"
                        onClick={onDetectJava}
                      >
                        <i className="fa-solid fa-wand-magic-sparkles text-sm" />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Для новых версий Java скачивается автоматически — этот путь используется как
                      запасной.
                    </p>
                  </Field>
                  <Field label="JVM-аргументы" hint="Доп. флаги виртуальной машины при запуске (через пробел)" column>
                    <input
                      className={`${inputCls} font-mono`}
                      value={s.jvm_args}
                      placeholder="-XX:+UseG1GC -Dfile.encoding=UTF-8"
                      onChange={(e) => update({ jvm_args: e.target.value })}
                    />
                  </Field>
                </Card>
              </>
            )}

            {cat === "game" && (
              <>
                <h2 className="text-lg font-bold text-text">Игра</h2>
                <Card>
                  <Field label="Оперативная память" hint="Сколько ОЗУ выделять игре">
                    <span className="rounded-md bg-bg px-2.5 py-1 text-sm font-semibold text-accent">
                      {ramGb} ГБ
                    </span>
                  </Field>
                  <div className="px-4 pb-4">
                    <input
                      type="range"
                      min={1024}
                      max={16384}
                      step={512}
                      value={s.ram_mb}
                      onChange={(e) => update({ ram_mb: Number(e.target.value) })}
                      className="aciron-range"
                      style={
                        {
                          "--pct": `${((s.ram_mb - 1024) / (16384 - 1024)) * 100}%`,
                        } as CSSProperties
                      }
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>1 ГБ</span>
                      <span>16 ГБ</span>
                    </div>
                  </div>
                  <Field
                    label="Запуск в полноэкранном режиме"
                    hint="Игра будет открываться на весь экран (через options.txt)"
                  >
                    <Toggle value={s.fullscreen} onChange={(v) => update({ fullscreen: v })} />
                  </Field>
                  <Field label="Размер окна игры" hint="Если полноэкранный режим выключен">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-center text-sm text-text outline-none focus:border-accent disabled:opacity-50"
                        value={s.window_width}
                        disabled={s.fullscreen}
                        onChange={(e) => update({ window_width: Number(e.target.value) })}
                      />
                      <i className="fa-solid fa-xmark text-xs text-muted" />
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-center text-sm text-text outline-none focus:border-accent disabled:opacity-50"
                        value={s.window_height}
                        disabled={s.fullscreen}
                        onChange={(e) => update({ window_height: Number(e.target.value) })}
                      />
                    </div>
                  </Field>
                </Card>
              </>
            )}

            {cat === "behavior" && (
              <>
                <h2 className="text-lg font-bold text-text">Поведение</h2>
                <Card>
                  <Field
                    label="Скрывать лаунчер при запуске игры"
                    hint="Спрячется, пока игра открыта, и вернётся после её закрытия"
                  >
                    <Toggle value={s.hide_on_launch} onChange={(v) => update({ hide_on_launch: v })} />
                  </Field>
                  <Field
                    label="Анимация фона"
                    hint={
                      s.background_anim === null
                        ? `Авто по железу: сейчас ${hwCap ? "включена" : "выключена"}`
                        : "Плавающие кубики на фоне лаунчера"
                    }
                  >
                    <Toggle
                      value={s.background_anim ?? hwCap}
                      onChange={(v) => update({ background_anim: v })}
                    />
                  </Field>
                  <Field
                    label="Discord Rich Presence"
                    hint="Показывать в Discord, во что вы играете"
                  >
                    <Toggle value={s.discord_rpc} onChange={(v) => update({ discord_rpc: v })} />
                  </Field>
                  <Field
                    label="Авто добовление серверов"
                    hint="Добавляет топ 5 серверов из категории Сервера в список серверов"
                  >
                    <Toggle value={s.autoadd_server} onChange={(v) => update({ autoadd_server: v })} />
                  </Field>
                  <Field
                    label="Проверять обновления при запуске"
                    hint="Показывать зелёную кнопку скачивания у версии, если вышло обновление"
                  >
                    <Toggle
                      value={s.auto_update_check}
                      onChange={(v) => update({ auto_update_check: v })}
                    />
                  </Field>
                </Card>
              </>
            )}

            {cat === "folders" && (
              <>
                <h2 className="text-lg font-bold text-text">Папки лаунчера</h2>
                <Card>
                  <Field label="Папка игры" column>
                    <PathRow value={s.game_dir} onPick={() => pick("game_dir")} onOpen={() => openFolder(s.game_dir)} />
                  </Field>
                  <Field label="Папка версий" column>
                    <PathRow value={s.versions_dir} onPick={() => pick("versions_dir")} onOpen={() => openFolder(s.versions_dir)} />
                  </Field>
                  <Field label="Папка сборок" column>
                    <PathRow value={s.builds_dir} onPick={() => pick("builds_dir")} onOpen={() => openFolder(s.builds_dir)} />
                  </Field>
                </Card>
              </>
            )}
          </div>
        </div>

        {}
        {!saved && (
          <div className="save-pop flex items-center gap-3 border-t border-border bg-panel px-6 py-3">
            <span className="flex items-center gap-2 text-sm text-muted">
              <i className="fa-solid fa-circle-info text-accent" />
              Есть несохранённые изменения
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  getSettings().then(setS);
                  setSaved(true);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-text"
              >
                Отменить
              </button>
              <button
                onClick={onSave}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
              >
                <i className="fa-solid fa-floppy-disk" />
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
