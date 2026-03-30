"use client";

export function Pricing({ mode = "default" }: { mode?: "default" | "panel" } = {}) {
  return (
    <section
      className={[
        "bg-transparent",
        mode === "panel" ? "px-0 pb-0 pt-0" : "px-4 pb-16 pt-4 sm:px-6 lg:px-8"
      ].join(" ")}
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl bg-white/90 p-6 shadow-soft ring-1 ring-emerald-50">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Специальная цена на запуск</p>

          <div className="mt-3 flex items-baseline gap-3">
            {/* ЗДЕСЬ МЕНЯТЬ ОСНОВНУЮ ЦЕНУ */}
            <div className="text-3xl font-semibold text-slate-900 sm:text-4xl">870 ₽</div>
            <div className="flex flex-col text-xs text-slate-500">
              {/* ЗДЕСЬ МЕНЯТЬ СТАРУЮ ЦЕНУ */}
              <span className="line-through opacity-70">1990 ₽</span>
              <span>за один участок</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
