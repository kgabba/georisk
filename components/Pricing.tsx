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
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Тарифы</h2>
        <p className="mt-1 text-sm text-slate-600">
          Выберите формат проверки участка перед сделкой или стройкой.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-soft ring-1 ring-emerald-50/80 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Разовая проверка
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              280&nbsp;₽
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Один участок — полный отчёт по георискам в PDF.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-soft ring-1 ring-emerald-100 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
              Безлимит на месяц
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              1&nbsp;450&nbsp;₽
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Сколько угодно проверок в течение 30 дней — удобно риелторам и застройщикам.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
