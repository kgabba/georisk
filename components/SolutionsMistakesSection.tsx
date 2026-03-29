"use client";

import { MapPinned } from "lucide-react";

type SolutionCard = {
  tag: string;
  title: string;
  description: string;
  loss: string;
};

const cards: SolutionCard[] = [
  {
    tag: "ВОДООХРАННАЯ ЗОНА",
    title: "Купил участок — стройку запретили",
    description:
      "Участок попал в водоохранную зону или ЗОУИТ. Строительство оказалось невозможно.",
    loss: "от 2 до 4 млн ₽"
  },
  {
    tag: "ЛЭП И ОХРАННЫЕ ЗОНЫ",
    title: "ЛЭП оказалась слишком близко",
    description:
      "Банк отказал в ипотеке, нотариус завернул сделку. Продали со скидкой 25–35%.",
    loss: "от 1 до 3 млн ₽"
  },
  {
    tag: "ГЕНПЛАН И ПЗЗ",
    title: "Генплан не позволяет ИЖС",
    description:
      "Участок в сельхозземлях или зелёной зоне. Разрешение на жилой дом не получить.",
    loss: "от 1,5 до 3,5 млн ₽"
  },
  {
    tag: "ПОДТОПЛЕНИЕ И РЕЛЬЕФ",
    title: "Подтопление и опасный уклон",
    description:
      "Весной участок уходит под воду или начинается оползень. Фундамент разрушается.",
    loss: "от 1,5 до 4 млн ₽"
  }
];

export function SolutionsMistakesSection() {
  return (
    <section className="bg-transparent px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 max-w-4xl">
          <h2 className="text-balance text-[clamp(1.75rem,4.2vw,2.75rem)] font-bold leading-[1.08] tracking-tight text-slate-900">
            Каждый месяц люди теряют 1–5 млн ₽ на участках, которые казались
            идеальными
          </h2>
          <p className="mt-5 max-w-3xl text-lg font-normal leading-relaxed text-slate-600 sm:text-xl">
            Вот 4 самые частые ошибки, которые мы находим до того, как вы
            потеряете деньги
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {cards.map((card) => (
            <article
              key={card.tag}
              className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl bg-[linear-gradient(148deg,#f0f7f4_0%,#e8f5ef_42%,#e6f0fa_100%)] p-5 shadow-md ring-1 ring-emerald-100/60 transition duration-300 ease-out hover:shadow-[0_12px_36px_-8px_rgba(15,23,42,0.22)] hover:ring-slate-300/40 sm:min-h-[440px] sm:p-6"
            >
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 sm:right-4 sm:top-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm sm:h-9 sm:w-9">
                  <MapPinned className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight text-slate-900 sm:text-sm">
                  GeoRisk
                </span>
              </div>

              <p className="pr-[5.5rem] text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:pr-32">
                {card.tag}
              </p>

              <h3 className="mt-4 text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {card.description}
              </p>
              <p className="mt-4 text-xs font-medium text-slate-500">
                Реальная потеря: {card.loss}
              </p>

              <div className="mt-auto pt-6">
                <div className="min-h-[128px] rounded-xl border border-slate-200/90 bg-white/55 p-4 shadow-inner backdrop-blur-[1px]">
                  <div className="flex h-full flex-col justify-end gap-2">
                    <div className="flex items-end gap-1">
                      <div className="h-8 w-1/5 rounded-sm bg-slate-300/70" />
                      <div className="h-12 w-1/5 rounded-sm bg-slate-300/60" />
                      <div className="h-6 w-1/5 rounded-sm bg-slate-300/50" />
                      <div className="h-14 w-1/5 rounded-sm bg-geoblue/25" />
                      <div className="h-10 w-1/5 rounded-sm bg-slate-300/55" />
                    </div>
                    <div className="h-px w-full bg-slate-200/80" />
                    <p className="text-[10px] text-slate-400">
                      Место для мини-графики или иконки
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
