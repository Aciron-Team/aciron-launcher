import { useState, type ReactNode } from "react";
import Modal from "./Modal";
import { addOfflineAccount, addMicrosoftAccount, openUrl, isTauri } from "../api";
import { MicrosoftIcon } from "./Icons";

type Step = "choose" | "offline" | "aciron" | "microsoft";

const inputCls =
  "w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent";

export default function AddAccountModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authUrl, setAuthUrl] = useState("");

  const done = () => {
    onAdded();
    onClose();
  };

  const submitOffline = async () => {
    setError("");
    const nick = name.trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) {
      return setError(
        "Ник: 3–16 символов, только латиница, цифры и _ (без пробелов, кириллицы и эмодзи)"
      );
    }
    setBusy(true);
    try {
      await addOfflineAccount(nick);
      done();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitAciron = () => {
    setError("");
    if (!login.trim() || !password) return setError("Введите email и пароль");
    setNotice("Аккаунты Aciron скоро — сервис авторизации в разработке.");
  };

  const startMicrosoft = async () => {
    setStep("microsoft");
    setError("");
    setAuthUrl("");
    setBusy(true);

    let unlisten: (() => void) | undefined;
    if (isTauri) {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<{ url: string }>("ms-auth-open", (e) => {
        setAuthUrl(e.payload.url);
        openUrl(e.payload.url);
      });
    } else {
      setAuthUrl("https://login.microsoftonline.com/");
    }

    try {
      await addMicrosoftAccount();
      done();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      unlisten?.();
    }
  };

  const title =
    step === "offline"
      ? "Пиратский аккаунт"
      : step === "aciron"
      ? "Вход в Aciron ID"
      : step === "microsoft"
      ? "Вход через Microsoft"
      : "Добавить аккаунт";

  return (
    <Modal title={title} icon="fa-user-plus" onClose={onClose}>
      <div className="p-5">
        {step === "choose" && (
          <div className="space-y-2.5">
            <TypeButton
              icon="fa-user-secret"
              iconBg="bg-bg text-accent"
              title="Пиратский аккаунт"
              desc="Оффлайн аккаунт"
              onClick={() => setStep("offline")}
            />
            <TypeButton
              node={<MicrosoftIcon size={22} />}
              iconBg="bg-bg fill-accent"
              title="Лицензия (Microsoft)"
              desc="Официальный вход через аккаунт Microsoft"
              onClick={startMicrosoft}
            />
            <TypeButton
              node={<i className="fa-solid fa-key"></i>}
              iconBg="bg-bg text-accent"
              title="Аккаунт Aciron"
              desc="Единый аккаунт Aciron ID"
              onClick={() => {
                setNotice("");
                setError("");
                setStep("aciron");
              }}
            />
          </div>
        )}

        {step === "offline" && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">Ник игрока</span>
              <input
                autoFocus
                className={inputCls}
                value={name}
                placeholder="Player"
                maxLength={16}
                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submitOffline()}
              />
            </label>
            {error && <Err msg={error} />}
            <div className="flex gap-2 pt-1">
              <BackBtn onClick={() => setStep("choose")} />
              <PrimaryBtn onClick={submitOffline} busy={busy} label="Добавить" />
            </div>
          </div>
        )}

        {step === "microsoft" && (
          <div className="space-y-4">
            {!authUrl && !error && (
              <div className="flex flex-col items-center gap-3 py-6 text-muted">
                <i className="fa-solid fa-spinner fa-spin text-2xl" />
                <span className="text-sm">Открываем вход Microsoft…</span>
              </div>
            )}

            {authUrl && !error && (
              <>
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <i className="fa-brands fa-microsoft text-2xl" />
                  </div>
                  <p className="text-sm text-text">
                    Мы открыли вход Microsoft в браузере.
                  </p>
                  <p className="text-xs text-muted">
                    Войдите там — окно закроется, а вход завершится здесь автоматически.
                  </p>
                </div>
                <button
                  onClick={() => openUrl(authUrl)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/50"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                  Браузер не открылся? Открыть вручную
                </button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted">
                  <i className="fa-solid fa-spinner fa-spin" />
                  Ожидание входа…
                </div>
              </>
            )}

            {error && <Err msg={error} />}

            <div className="flex gap-2 pt-1">
              <BackBtn
                onClick={() => {
                  setError("");
                  setAuthUrl("");
                  setStep("choose");
                }}
              />
            </div>
          </div>
        )}

        {step === "aciron" && (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">Email</span>
              <input
                autoFocus
                type="email"
                className={inputCls}
                value={login}
                placeholder="you@example.com"
                onChange={(e) => {
                  setLogin(e.target.value);
                  setNotice("");
                }}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">Пароль</span>
              <input
                type="password"
                className={inputCls}
                value={password}
                placeholder="••••••••"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setNotice("");
                }}
                onKeyDown={(e) => e.key === "Enter" && submitAciron()}
              />
            </label>
            {error && <Err msg={error} />}
            {notice && <Notice msg={notice} />}
            <div className="flex gap-2 pt-1">
              <BackBtn onClick={() => setStep("choose")} />
              <PrimaryBtn onClick={submitAciron} busy={busy} label="Войти" />
            </div>
            <div className="pt-1 text-center text-xs text-muted">
              Нет аккаунта?{" "}
              <button
                onClick={() =>
                  setNotice("Регистрация Aciron скоро — сервис в разработке.")
                }
                className="font-semibold text-accent transition-colors hover:text-accent-hover"
              >
                Зарегистрироваться
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TypeButton({
  icon,
  node,
  title,
  desc,
  iconBg,
  onClick,
  disabled,
  brand,
}: {
  icon?: string;
  node?: ReactNode;
  title: string;
  desc: string;
  iconBg: string;
  onClick?: () => void;
  disabled?: boolean;
  brand?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-accent/50"
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lg ${iconBg}`}>
        {node ?? <i className={`${brand ? "fa-brands" : "fa-solid"} ${icon}`} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold text-text">
          {title}
          {disabled && (
            <span className="rounded bg-bg px-1.5 py-0.5 text-[10px] font-medium text-muted">
              <i className="fa-solid fa-lock mr-1" />
              скоро
            </span>
          )}
        </div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      {!disabled && <i className="fa-solid fa-chevron-right text-xs text-muted" />}
    </button>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-sm text-[#ef4444]">
      <i className="fa-solid fa-circle-exclamation mt-0.5" />
      <span className="min-w-0 break-words">{msg}</span>
    </div>
  );
}

function Notice({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-accent">
      <i className="fa-solid fa-circle-info mt-0.5" />
      <span className="min-w-0 break-words">{msg}</span>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
    >
      <i className="fa-solid fa-arrow-left text-xs" />
      Назад
    </button>
  );
}

function PrimaryBtn({ onClick, busy, label }: { onClick: () => void; busy: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="ml-auto flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active disabled:opacity-60"
    >
      {busy && <i className="fa-solid fa-spinner fa-spin" />}
      {label}
    </button>
  );
}
