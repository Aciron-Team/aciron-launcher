import { useEffect, useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  type Account,
  type AccountsState,
  getAccounts,
  setActiveAccount,
  removeAccount,
  acironLinkLicense,
  headSkinUrl,
  openUrl,
  isTauri,
  ACIRON_ID_WEB,
} from "../api";
import Head from "./Head";
import Modal from "./Modal";
import AddAccountModal from "./AddAccountModal";

const typeLabel = (a: Account) =>
  a.type === "microsoft"
    ? "Microsoft"
    : a.type === "aciron"
    ? a.licensed
      ? "Aciron ID · лицензия"
      : "Aciron ID"
    : "Оффлайн";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [warn, setWarn] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState("");
  const [state, setState] = useState<AccountsState>({ accounts: [], active: "" });
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const refresh = () => getAccounts().then(setState);
  useEffect(() => {
    refresh();
  }, []);

  const active = state.accounts.find((a) => a.id === state.active) ?? state.accounts[0];

  const linkLicense = async () => {
    if (!active) return;
    setWarn(false);
    setLinking(true);
    setLinkMsg("Открываем вход Microsoft в браузере…");
    let unlisten: (() => void) | undefined;
    try {
      if (isTauri) {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ url: string }>("ms-auth-open", (e) => openUrl(e.payload.url));
      }
      await acironLinkLicense(active.id);
      setLinkMsg("");
      refresh();
    } catch (e) {
      setLinkMsg(String(e).replace(/^Error:\s*/, ""));
    } finally {
      setLinking(false);
      unlisten?.();
    }
  };

  const pick = async (id: string) => {
    await setActiveAccount(id);
    setOpen(false);
    refresh();
  };
  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeAccount(id);
    refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-14 items-center gap-2.5 rounded-xl border px-3 transition-colors ${
          open ? "border-border bg-card" : "border-transparent bg-card hover:bg-border/50"
        }`}
      >
        {active ? (
          <Head skin={headSkinUrl(active)} name={active.username} size={32} />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-md bg-bg text-muted">
            <i className="fa-solid fa-user text-sm" />
          </span>
        )}
        <div className="text-left leading-tight">
          <div className="max-w-[120px] truncate text-sm font-semibold text-text">
            {active?.username ?? "Нет аккаунта"}
          </div>
          <div className="text-[11px] text-muted">
            {active ? typeLabel(active) : "Добавьте аккаунт"}
          </div>
        </div>
        <i
          className={`fa-solid fa-chevron-down ml-1 text-[10px] text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-panel shadow-xl shadow-black/40">
          <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Аккаунты
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {state.accounts.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted">Список пуст</div>
            )}
            {state.accounts.map((a) => {
              const isActive = a.id === active?.id;
              return (
                <button
                  key={a.id}
                  onClick={() => pick(a.id)}
                  className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-card"
                >
                  <Head skin={headSkinUrl(a)} name={a.username} size={30} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm font-medium text-text">{a.username}</div>
                    <div className="text-[11px] text-muted">{typeLabel(a)}</div>
                  </div>
                  {isActive ? (
                    <i className="fa-solid fa-circle-check text-accent" />
                  ) : (
                    <i
                      onClick={(e) => remove(e, a.id)}
                      className="fa-solid fa-xmark p-1 text-muted opacity-0 transition-opacity hover:text-[#ef4444] group-hover:opacity-100"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {active?.type === "aciron" && (
            <div className="space-y-0.5 border-t border-border p-1.5">
              <button
                onClick={() => openUrl(ACIRON_ID_WEB)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-text transition-colors hover:bg-card"
              >
                <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-card text-accent">
                  <i className="fa-solid fa-id-badge text-xs" />
                </span>
                Личный кабинет
              </button>

              {active.licensed ? (
                <div className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-muted">
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-card text-accent">
                    <i className="fa-solid fa-certificate text-xs" />
                  </span>
                  Лицензия подключена
                </div>
              ) : linking ? (
                <div className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-muted">
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-card text-accent">
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                  </span>
                  {linkMsg || "Ожидание входа Microsoft…"}
                </div>
              ) : (
                <button
                  onClick={() => setWarn(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-text transition-colors hover:bg-card"
                >
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-card text-accent">
                    <i className="fa-solid fa-key text-xs" />
                  </span>
                  Подключить лицензию
                </button>
              )}
              {linkMsg && !linking && !active.licensed && (
                <div className="px-2.5 pb-1 text-[11px] text-[#ef4444]">{linkMsg}</div>
              )}
            </div>
          )}

          <div className="border-t border-border p-1.5">
            <button
              onClick={() => {
                setOpen(false);
                setModal(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-accent transition-colors hover:bg-card"
            >
              <span className="grid h-[30px] w-[30px] place-items-center rounded-md border border-dashed border-accent/50">
                <i className="fa-solid fa-plus text-xs" />
              </span>
              Добавить аккаунт
            </button>
          </div>
        </div>
      )}

      {modal && <AddAccountModal onClose={() => setModal(false)} onAdded={refresh} />}

      {warn && active && (
        <Modal
          title="Подключение лицензии"
          icon="fa-triangle-exclamation"
          onClose={() => setWarn(false)}
        >
          <div className="space-y-4 p-5">
            <p className="text-sm text-text">
              Вы привяжете лицензию Minecraft (Microsoft) к аккаунту{" "}
              <b>{active.aciron_name || active.username}</b> и будете играть через неё.
            </p>

            <div className="space-y-2.5">
              <WarnRow icon="fa-user-pen">
                Ник аккаунта <b>сменится на лицензионный</b> — именно он будет
                отображаться в игре и на серверах.
              </WarnRow>
              <WarnRow icon="fa-scale-balanced">
                Используйте <b>только свою</b> лицензию. Взлом, кража или использование
                чужих аккаунтов — <b>не ответственность Aciron</b>.
              </WarnRow>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setWarn(false)}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:text-text"
              >
                Отмена
              </button>
              <button
                onClick={linkLicense}
                className="ml-auto flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-hover active:bg-accent-active"
              >
                <i className="fa-brands fa-microsoft" />
                Продолжить и войти
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WarnRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2.5 text-sm text-text">
      <i className={`fa-solid ${icon} mt-0.5 text-accent`} />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
