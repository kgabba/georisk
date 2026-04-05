"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

type SolutionCard = {
  mobileLead: string;
  tag: string;
  title: string;
  description: string;
  loss: string;
};

const cards: SolutionCard[] = [
  {
    mobileLead: "Водоохранная зона",
    tag: "ВОДООХРАННАЯ ЗОНА",
    title: "Купил участок — стройку запретили",
    description:
      "Участок попал в водоохранную зону. Строительство оказалось невозможно.",
    loss: "от 2 до 4 млн ₽"
  },
  {
    mobileLead: "ЛЭП и охранные зоны",
    tag: "ЛЭП И ОХРАННЫЕ ЗОНЫ",
    title: "ЛЭП оказалась слишком близко",
    description:
      "Банк отказал в ипотеке, нотариус завернул сделку. Продали со скидкой 25–35%.",
    loss: "от 1 до 3 млн ₽"
  },
  {
    mobileLead: "Генплан и ПЗЗ",
    tag: "ГЕНПЛАН И ПЗЗ",
    title: "Генплан не позволяет ИЖС",
    description:
      "Участок в сельхозземлях или зелёной зоне. Разрешение на жилой дом не получить.",
    loss: "от 1,5 до 3,5 млн ₽"
  },
  {
    mobileLead: "Подтопление и рельеф",
    tag: "ПОДТОПЛЕНИЕ И РЕЛЬЕФ",
    title: "Подтопление и опасный уклон",
    description:
      "Весной участок уходит под воду или начинается оползень. Фундамент разрушается.",
    loss: "от 1,5 до 4 млн ₽"
  }
];

export function SolutionsMistakesSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  function toggle(idx: number) {
    setOpenIdx((c) => (c === idx ? null : idx));
  }

  return (
    <section
      id="frequent-mistakes"
      className="order-4 bg-transparent px-4 pb-16 pt-4 max-md:scroll-mt-24 max-md:bg-mint-50 max-md:pt-3 sm:px-6 md:order-3 md:scroll-mt-0 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="max-md:text-[1.35rem] max-md:leading-snug md:hidden text-2xl font-semibold text-slate-900">
              Самые частые ошибки, которые мы находим до того, как вы потеряете деньги
            </h2>
            <h2 className="hidden text-2xl font-semibold text-slate-900 md:block md:text-3xl">
              Каждый месяц люди теряют 1–5 млн ₽
              <br />
              на участках, которые казались идеальными
            </h2>
            <p className="mt-2 hidden text-base text-slate-600 md:block">
              Вот 4 самые частые ошибки, которые мы находим до того, как вы
              потеряете деньги
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {cards.map((card, idx) => {
            const imageSrc =
              idx === 0
                ? "/report-page-3.png"
                : idx === 1
                  ? "/report-page-1.png"
                  : idx === 2
                    ? "/report-page-4.png"
                    : "/report-page-2.png";

            const expanded = openIdx === idx;

            return (
              <article
                key={card.tag}
                className="group relative flex max-md:min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(148deg,#f0f7f4_0%,#e8f5ef_42%,#e6f0fa_100%)] p-4 shadow-md ring-1 ring-emerald-100/60 transition duration-300 ease-out hover:shadow-[0_12px_36px_-8px_rgba(15,23,42,0.22)] hover:ring-slate-300/40 sm:min-h-[440px] sm:p-6"
              >
                <div className="pointer-events-none absolute right-3 top-3 hidden sm:right-4 sm:top-4 md:block">
                  <div
                    className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm ring-2 ring-white/90 sm:h-3 sm:w-3"
                    aria-hidden
                  />
                </div>

                <div className="flex items-start justify-between gap-3 md:hidden">
                  <div className="min-w-0 flex-1 pr-1">
                    <p className="text-xs font-medium text-slate-600">{card.mobileLead}</p>
                    <h3 className="mt-1.5 text-base font-semibold leading-snug text-slate-900">
                      {card.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/90 bg-white/90 text-slate-700 shadow-sm outline-none ring-slate-900/5 transition hover:border-slate-400 hover:bg-white"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Свернуть" : "Развернуть"}
                  >
                    {expanded ? (
                      <Minus className="h-4 w-4" strokeWidth={2.5} />
                    ) : (
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    )}
                  </button>
                </div>

                <div className="hidden md:block">
                  <p className="pr-7 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:pr-8">
                    {card.tag}
                  </p>
                  <h3 className="mt-4 min-h-[3.5rem] text-base font-semibold leading-snug text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-2 min-h-[5rem] text-sm leading-relaxed text-slate-600">
                    {card.description}
                  </p>
                </div>

                <div className={expanded ? "mt-3 md:hidden" : "hidden"}>
                  <p className="text-sm leading-relaxed text-slate-600">{card.description}</p>
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-transparent shadow-inner">
                    <img
                      src={imageSrc}
                      alt=""
                      className="block h-full min-h-[128px] w-full bg-[#ffffff] object-cover object-[50%_12%]"
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium leading-tight text-slate-500">
                    Потери: {card.loss}
                  </p>
                </div>

                <div className="mt-auto hidden pt-6 md:block">
                  <div className="min-h-[128px] overflow-hidden rounded-xl border border-slate-200/90 bg-transparent shadow-inner">
                    <img
                      src={imageSrc}
                      alt=""
                      className="block h-full w-full bg-[#ffffff] object-cover object-[50%_12%]"
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium leading-tight text-slate-500 sm:text-sm whitespace-nowrap">
                    Потери: {card.loss}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
