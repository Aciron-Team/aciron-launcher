
export default function FriendsPage() {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-card text-3xl text-accent">
          <i className="fa-solid fa-user-group" />
        </div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <i className="fa-solid fa-hammer text-[10px]" />
          В разработке
        </div>
        <h2 className="text-xl font-bold text-text">Друзья</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Скоро вы сможете добавлять друзей, видеть, кто сейчас в игре, и заходить на сборки
          вместе. Раздел находится в разработке.
        </p>
      </div>
    </div>
  );
}
