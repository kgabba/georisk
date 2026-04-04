"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Phone, X } from "lucide-react";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SITE_TELEGRAM_URL } from "@/lib/contact";

function TelegramGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function Pricing({ mode = "default" }: { mode?: "default" | "panel" } = {}) {
  const [trialOpen, setTrialOpen] = useState(false);
  const titleId = useId();
  const close = useCallback(() => setTrialOpen(false), []);

  useEffect(() => {
    if (!trialOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [trialOpen, close]);

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
            onClick={() => setTrialOpen(true)}
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

      {trialOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/80 sm:p-8"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 id={titleId} className="pr-10 text-lg font-semibold text-slate-900 sm:text-xl">
              Бесплатная пробная проверка
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Напишите администратору в Telegram или позвоните — ответим за пару минут и подключим одну
              пробную проверку без оплаты.
            </p>

            <a
              href={`tel:${SITE_PHONE_TEL}`}
              className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-900 transition hover:border-geoblue hover:bg-white hover:ring-2 hover:ring-geoblue/30"
            >
              <Phone className="h-5 w-5 shrink-0 text-geoblue" aria-hidden />
              {SITE_PHONE_DISPLAY}
            </a>

            <a
              href={SITE_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-md transition hover:bg-slate-800"
            >
              <TelegramGlyph className="h-5 w-5 shrink-0 text-sky-300" />
              Написать в Telegram
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
