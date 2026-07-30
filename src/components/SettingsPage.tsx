import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  type Settings,
  getSettings,
  saveSettings,
  defaultSettings,
  detectJava,
  pickFolder,
  pickFile,
  openFolder,
  moveDirectories,
  hardwareCapable,
  totalRamMb,
} from "../api";
import { useTheme, PRESET_LIST, SURFACE } from "../ThemeContext";
import Modal from "./Modal";
import { getSfxPrefs, setSfxPrefs } from "../sfx";
import { useToast } from "./../ToastContext";

const FOLDER_FIELDS: { key: "game_dir" | "versions_dir" | "builds_dir"; label: string }[] = [
  { key: "game_dir", label: "Папка игры" },
  { key: "versions_dir", label: "Папка версий" },
  { key: "builds_dir", label: "Папка сборок" },
];

type FolderMove = { from: string; to: string; label: string };

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
  accent,
  active,
  onClick,
}: {
  label: string;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col gap-2 rounded-[14px] border-1 p-2.5 text-left transition-colors ${
        active ? "border-accent bg-card" : "border-[#232427]/65 hover:border-accent/40"
      }`}
    >
      <div
        className="relative flex h-14 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2.5"
        style={{ background: SURFACE.bg }}
      >
        <span className="h-8 w-8 shrink-0 rounded-[8px]" style={{ background: accent }} />
        <span className="flex-1 space-y-1.5">
          <span className="block h-2 w-full rounded-full" style={{ background: SURFACE.card }} />
          <span className="block h-2 w-2/3 rounded-full" style={{ background: SURFACE.card }} />
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${active ? "text-accent" : "text-text"}`}>{label}</span>
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

export default function SettingsPage({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    onDirtyChange?.(!saved);
  }, [saved, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const [hwCap, setHwCap] = useState(true);

  const [ramMax, setRamMax] = useState(16384);

  const [sfx, setSfx] = useState(getSfxPrefs);
  const [cat, setCat] = useState<CatId>("theme");
  const {
    state: theme,
    setTheme,
    setCustom,
    saved: themePresets,
    savePreset,
    applySaved,
    deleteSaved,
  } = useTheme();
  const [presetName, setPresetName] = useState("");
  const [folderPrompt, setFolderPrompt] = useState<FolderMove[] | null>(null);
  const toast = useToast();

  const origRef = useRef<Record<"game_dir" | "versions_dir" | "builds_dir", string> | null>(null);

  useEffect(() => {
    getSettings().then((fresh) => {
      setS(fresh);
      origRef.current = {
        game_dir: fresh.game_dir,
        versions_dir: fresh.versions_dir,
        builds_dir: fresh.builds_dir,
      };
    });
    hardwareCapable().then(setHwCap);
    totalRamMb().then(setRamMax);
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

  const persist = async (move: boolean, moves: FolderMove[]) => {
    await saveSettings(s);
    origRef.current = {
      game_dir: s.game_dir,
      versions_dir: s.versions_dir,
      builds_dir: s.builds_dir,
    };
    setSaved(true);
    setFolderPrompt(null);

    if (move && moves.length > 0) {
      window.dispatchEvent(
        new CustomEvent("aciron-task-start", { detail: { name: "Перенос файлов" } })
      );
      moveDirectories(moves.map((m) => ({ from: m.from, to: m.to })))
        .then(() => toast("Файлы перенесены в новое место", "success"))
        .catch((e) => {
          window.dispatchEvent(new CustomEvent("aciron-task-end"));
          toast(`Перенос файлов: ${String(e)}`, "error");
        });
    }
  };

  const onSave = async () => {
    const orig = origRef.current;
    const moves: FolderMove[] = orig
      ? FOLDER_FIELDS.map((f) => ({
          from: orig[f.key],
          to: String(s[f.key]),
          label: f.label,
        })).filter((m) => m.from && m.to && m.from !== m.to)
      : [];

    if (moves.length > 0) {
      setFolderPrompt(moves);
      return;
    }
    await persist(false, []);
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

  return (
    <div className="flex h-full min-h-0">
      {}
      <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border p-3">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors ${
              cat === c.id ? "bg-card text-text" : "text-muted hover:text-text"
            }`}
          >
            <i className={`fa-solid ${c.icon} w-4 text-center ${cat === c.id ? "text-accent" : ""}`} />
            {c.label}
          </button>
        ))}
        <div className="mt-auto space-y-1 pt-3">
          <button
            onClick={onReset}
            className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-sm text-muted transition-colors hover:text-text"
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
                      accent={t.accent}
                      active={theme.id === t.id}
                      onClick={() => setTheme(t.id)}
                    />
                  ))}
                  <ThemeCard
                    label="Свой цвет"
                    accent={theme.customAccent}
                    active={theme.id === "custom"}
                    onClick={() => setTheme("custom")}
                  />
                </div>
                {theme.id === "custom" && (
                  <Card>
                    <div className="flex flex-wrap items-center gap-6 px-4 py-4">
                      <ColorField
                        label="Цвет акцента"
                        value={theme.customAccent}
                        onChange={(v) => setCustom({ customAccent: v })}
                      />
                      <span className="text-[11px] leading-relaxed text-muted">
                        Фон и панели в новом дизайне общие для всех тем — меняется только акцент.
                      </span>
                    </div>
                    {}
                    <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                      <input
                        className={inputCls}
                        value={presetName}
                        maxLength={24}
                        placeholder="Название пресета"
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && presetName.trim()) {
                            savePreset(presetName);
                            setPresetName("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (!presetName.trim()) return;
                          savePreset(presetName);
                          setPresetName("");
                        }}
                        disabled={!presetName.trim()}
                        className="flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-50"
                      >
                        <i className="fa-solid fa-floppy-disk" />
                        Сохранить
                      </button>
                    </div>
                  </Card>
                )}

                {}
                {themePresets.length > 0 && (
                  <div>
                    <span className="mb-2 block text-xs text-muted">Мои пресеты</span>
                    <div className="flex flex-wrap gap-2">
                      {themePresets.map((p) => (
                        <div
                          key={p.id}
                          className="group flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 pl-2 pr-1.5 transition-colors hover:border-accent/50"
                        >
                          <button
                            onClick={() => applySaved(p)}
                            className="flex items-center gap-2"
                            title="Применить пресет"
                          >
                            <span
                              className="h-6 w-6 shrink-0 rounded-md"
                              style={{ background: p.accent }}
                            >
                            </span>
                            <span className="text-sm font-medium text-text">{p.name}</span>
                          </button>
                          <button
                            onClick={() => deleteSaved(p.id)}
                            title="Удалить пресет"
                            className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:text-[#ef4444]"
                          >
                            <i className="fa-solid fa-xmark text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
                      Путь к Java дирректории
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
                      max={ramMax}
                      step={512}
                      value={Math.min(s.ram_mb, ramMax)}
                      onChange={(e) => update({ ram_mb: Number(e.target.value) })}
                      className="aciron-range"
                      style={
                        {
                          "--pct": `${
                            ((Math.min(s.ram_mb, ramMax) - 1024) / Math.max(1, ramMax - 1024)) * 100
                          }%`,
                        } as CSSProperties
                      }
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>1 ГБ</span>
                      <span>{Math.round(ramMax / 1024)} ГБ</span>
                    </div>
                  </div>
                  <Field
                    label="Запуск в полноэкранном режиме"
                    hint="Игра будет открываться на весь экран"
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
                <h2 className="text-lg font-bold text-text">Поведение лаунчера</h2>
                <Card>
                  {}
                  <Field label="Звук нажатия" hint="Щелчок при нажатии на кнопки">
                    <Toggle
                      value={sfx.click}
                      onChange={(v) => {
                        setSfx((p) => ({ ...p, click: v }));
                        setSfxPrefs({ click: v });
                      }}
                    />
                  </Field>
                  <Field label="Звук наведения" hint="Тихий отклик при наведении на кнопку">
                    <Toggle
                      value={sfx.hover}
                      onChange={(v) => {
                        setSfx((p) => ({ ...p, hover: v }));
                        setSfxPrefs({ hover: v });
                      }}
                    />
                  </Field>
                </Card>
                <Card>
                  <Field
                    label="Размер интерфейса"
                    hint="Масштаб окна лаунчера — работает и в развёрнутом/полноэкранном окне"
                  >
                    <span className="rounded-md bg-bg px-2.5 py-1 text-sm font-semibold text-accent">
                      {s.ui_scale}%
                    </span>
                  </Field>
                  <div className="px-4 pb-4">
                    <input
                      type="range"
                      min={80}
                      max={160}
                      step={5}
                      value={s.ui_scale}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        update({ ui_scale: v });

                        window.dispatchEvent(new CustomEvent("aciron-ui-scale", { detail: v }));
                      }}
                      className="aciron-range"
                      style={{ "--pct": `${((s.ui_scale - 80) / (160 - 80)) * 100}%` } as CSSProperties}
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-muted">
                      <span>80%</span>
                      <span>160%</span>
                    </div>
                  </div>
                  <Field
                    label="Скрывать лаунчер при запуске игры"
                    hint="Спрячется, пока игра открыта, и вернётся после её закрытия"
                  >
                    <Toggle value={s.hide_on_launch} onChange={(v) => update({ hide_on_launch: v })} />
                  </Field>
                  <Field
                    label="Анимация фона"
                    hint={"Плавающие кубики на фоне лаунчера"}
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
                    label="Авто добавление серверов"
                    hint="Добавляет топ 5 серверов из категории Сервера в список серверов"
                  >
                    <Toggle value={s.autoadd_server} onChange={(v) => update({ autoadd_server: v })} />
                  </Field>
                  <Field
                    label="Звук уведомлений"
                    hint="Сигнал при заявке в друзья и других всплывающих уведомлениях"
                  >
                    <Toggle value={s.notify_sound} onChange={(v) => update({ notify_sound: v })} />
                  </Field>
                  <Field
                    label="Проверять обновления при запуске"
                    hint=""
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
        <div
          aria-hidden={saved}
          className={`flex items-center gap-3 border-t border-border bg-panel px-6 py-3 transition-opacity duration-200 ${
            saved ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
            <span className="flex items-center gap-2 text-sm text-muted">
              <i className="fa-solid fa-circle-info text-accent" />
              Есть несохранённые изменения
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  getSettings().then((fresh) => {
                    setS(fresh);
                    origRef.current = {
                      game_dir: fresh.game_dir,
                      versions_dir: fresh.versions_dir,
                      builds_dir: fresh.builds_dir,
                    };

                    window.dispatchEvent(
                      new CustomEvent("aciron-ui-scale", { detail: fresh.ui_scale })
                    );
                  });
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
      </div>

      {folderPrompt && (
        <Modal title="Папки изменены" icon="fa-folder-tree" onClose={() => setFolderPrompt(null)}>
          <div className="p-5">
            <p className="text-sm text-text">
              Вы изменили расположение папок. Перенести существующие файлы в новое место?
            </p>
            <ul className="mt-3 space-y-1.5">
              {folderPrompt.map((m) => (
                <li key={m.label} className="rounded-lg bg-card px-3 py-2 text-xs">
                  <div className="font-semibold text-text">{m.label}</div>
                  <div className="mt-0.5 truncate text-muted" title={m.from}>
                    из: {m.from}
                  </div>
                  <div className="truncate text-muted" title={m.to}>
                    в: {m.to}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setFolderPrompt(null)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
              >
                Отмена
              </button>
              <button
                onClick={() => persist(false, folderPrompt)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/50"
              >
                Просто сохранить
              </button>
              <button
                onClick={() => persist(true, folderPrompt)}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
              >
                <i className="fa-solid fa-truck-fast" />
                Перенести и сохранить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
