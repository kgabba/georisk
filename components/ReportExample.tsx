"use client";

import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
  title: string;
  example: string;
  tag: string;
  tone: "blue" | "emerald" | "amber" | "slate";
};

const slides: Slide[] = [
  {
    tag: "Титульный лист",
    title: "Вердикт и структура отчёта",
    example: "Коротко и по делу: что проверили и что важно именно для вашего участка.",
    tone: "blue"
  },
  {
    tag: "Карты ограничений",
    title: "Наложение зон рисков",
    example: "Водоохранные зоны, ЛЭП, ООПТ, уклон/карст и подтопление — на одной карте.",
    tone: "emerald"
  },
  {
    tag: "Категории рисков",
    title: "Что найдено и что это значит",
    example: "Понятные выводы по каждой категории: как влияет на строительство и эксплуатацию.",
    tone: "amber"
  },
  {
    tag: "Рекомендации",
    title: "Следующие шаги для сделки",
    example: "Что проверить дальше и как снизить неопределённость перед решением.",
    tone: "slate"
  }
];

function toneBg(tone: Slide["tone"]) {
  switch (tone) {
    case "blue":
      return "bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_60%)]";
    case "emerald":
      return "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.28),_transparent_60%)]";
    case "amber":
      return "bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.26),_transparent_60%)]";
    default:
      return "bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),_transparent_60%)]";
  }
}

export function ReportExample() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const pages = useMemo(() => slides, []);

  function scroll(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.78),
      behavior: "smooth"
    });
  }

  return (
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Как выглядит отчёт GeoRisk
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Вы получаете понятный PDF‑отчёт с картами, выводами по категориям
            и рекомендациями. Без непонятных “скорингов”.
          </p>
        </div>

        <div className="flex-1">
          <div className="relative">
            {/* arrows */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() => scroll(-1)}
                className="pointer-events-auto ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-soft ring-1 ring-emerald-50 backdrop-blur hover:bg-white"
                aria-label="Назад"
              >
                <ChevronLeft className="h-5 w-5 text-slate-800" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                className="pointer-events-auto mr-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-soft ring-1 ring-emerald-50 backdrop-blur hover:bg-white"
                aria-label="Вперёд"
              >
                <ChevronRight className="h-5 w-5 text-slate-800" />
              </button>
            </div>

            {/* scroll-snap (не ломает скролл страницы) */}
            <div
              ref={scrollerRef}
              className={[
                "flex gap-4 overflow-x-auto pb-2",
                "scroll-smooth",
                "snap-x snap-mandatory",
                "[scrollbar-width:none]",
                "[&::-webkit-scrollbar]:hidden",
                "[overscroll-behavior-x:contain]"
              ].join(" ")}
            >
              {pages.map((s, idx) => (
                <article
                  key={idx}
                  className={[
                    "snap-start shrink-0 rounded-3xl bg-white/90 p-4 shadow-soft ring-1 ring-emerald-50",
                    "w-[88%] sm:w-[440px] lg:w-[420px]"
                  ].join(" ")}
                  aria-label={s.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {s.tag}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {s.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {s.example}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-50 text-slate-700 ring-1 ring-emerald-50">
                      <span className="text-sm font-semibold text-geoblue">{idx + 1}</span>
                    </div>
                  </div>

                  {/* placeholder area for graphs / pages */}
                  <div className="mt-4 overflow-hidden rounded-2xl bg-slate-900 p-3">
                    <div className={["rounded-xl p-3 text-white", toneBg(s.tone)].join(" ")}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-emerald-200">
                          Example preview
                        </span>
                        <span className="text-[10px] text-white/70">—</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="h-10 rounded-lg bg-white/10" />
                        <div className="h-10 rounded-lg bg-white/10" />
                        <div className="h-10 rounded-lg bg-white/10" />
                      </div>
                      <div className="mt-3 h-12 rounded-xl bg-white/10" />
                      <div className="mt-2 text-[10px] text-white/70">
                        Тут будет картинка/страница из PDF (заглушка под Figma).
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
