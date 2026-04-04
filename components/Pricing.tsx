"use client";

import { useContactAdminModal } from "@/components/ContactAdminModal";

export function Pricing({ mode = "default" }: { mode?: "default" | "panel" } = {}) {
  const { openContactModal } = useContactAdminModal();

  return (
    <section
      className={[
        "bg-transparent",
        mode === "panel" ? "px-0 pb-0 pt-0" : "px-4 pb-16 pt-4 sm:px-6 lg:px-8"
      ].join(" ")}
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Тарифы</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={openContactModal}
            className="flex flex-col rounded-2xl border-2 border-slate-300/90 bg-white/90 p-5 text-left shadow-soft ring-1 ring-emerald-50/80 transition hover:border-slate-400 sm:p-6"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Пробная проверка
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-lg font-medium text-slate-400 line-through decoration-slate-400">
                280&nbsp;₽
              </span>
              <span className="text-3xl font-semibold tracking-tight text-emerald-700 sm:text-4xl">
                0&nbsp;₽
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">Одна проверка участка — бесплатно.</p>
          </button>

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

          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-soft ring-1 ring-emerald-50/80 sm:col-span-2 sm:p-6 lg:col-span-1">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Безлимит на месяц
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              1&nbsp;450&nbsp;₽
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Сколько угодно проверок в течение 30 дней.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
