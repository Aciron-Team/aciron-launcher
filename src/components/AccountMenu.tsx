import { useEffect, useRef, useState } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  type Account,
  type AccountsState,
  getAccounts,
  setActiveAccount,
  removeAccount,
  headSkinUrl,
} from "../api";
import Head from "./Head";
import AddAccountModal from "./AddAccountModal";

const typeLabel = (t: Account["type"]) =>
  t === "microsoft" ? "Microsoft" : "Оффлайн";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [state, setState] = useState<AccountsState>({ accounts: [], active: "" });
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const refresh = () => getAccounts().then(setState);
  useEffect(() => {
    refresh();
  }, []);

  const active = state.accounts.find((a) => a.id === state.active) ?? state.accounts[0];

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
          open ? "border-border bg-card" : "border-transparent bg-card/60 hover:bg-card"
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
            {active ? typeLabel(active.type) : "Добавьте аккаунт"}
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
                    <div className="text-[11px] text-muted">{typeLabel(a.type)}</div>
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
    </div>
  );
}
