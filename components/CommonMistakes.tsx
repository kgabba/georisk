"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Droplet, MapPin, Zap } from "lucide-react";

type MistakeCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  loss: string;
};

const cards: MistakeCard[] = [
  {
    icon: AlertTriangle,
    title: "Купил участок — стройку запретили",
    description:
      "Водоохранная зона, ООПТ или ЗОУИТ. Дом снесли или оштрафовали.",
    loss: "от 2 до 4 млн ₽"
  },
  {
    icon: Zap,
    title: "ЛЭП ближе, чем казалось",
    description:
      "Банк отказал в ипотеке, нотариус завернул сделку. Пришлось продавать со скидкой.",
    loss: "от 1 до 3 млн ₽"
  },
  {
    icon: MapPin,
    title: "Генплан не позволяет ИЖС",
    description:
      "Участок в «сельхозке» или зелёной зоне. Разрешение на жилой дом не получить.",
    loss: "от 1,5 до 3,5 млн ₽"
  },
  {
    icon: Droplet,
    title: "Подтопление и проблемы с рельефом",
    description:
      "Весной участок уходит под воду или оползает. Фундамент трескается.",
    loss: "от 1,5 до 4 млн ₽"
  }
];

export function CommonMistakes() {
  return (
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-4xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Самые частые ошибки при покупке участка, которые обходятся в 1–5 млн ₽
          </h2>
          <p className="mt-3 text-base text-slate-600 sm:text-[17px]">
            Вот что обычно обнаруживают уже после покупки, когда проверяют только
            публичную кадастровую карту
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((item) => (
            <article
              key={item.title}
              className="flex h-full min-h-[280px] flex-col rounded-2xl bg-white/90 p-6 shadow-sm ring-1 ring-emerald-50 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg sm:min-h-[300px] sm:p-7"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <item.icon className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="text-[20px] font-semibold leading-snug text-slate-900 sm:text-[22px]">
                {item.title}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                {item.description}
              </p>
              <p className="mt-5 border-t border-emerald-100/80 pt-4 text-sm text-slate-500">
                Реальная потеря: {item.loss}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
