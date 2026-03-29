"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Droplet, MapPin, Zap } from "lucide-react";

type Card = {
  icon: LucideIcon;
  title: string;
  description: string;
  loss: string;
};

const cards: Card[] = [
  {
    icon: AlertTriangle,
    title: "Купил участок — стройку запретили",
    description:
      "Участок попал в водоохранную зону или ЗОУИТ. Строительство жилого дома оказалось невозможно.",
    loss: "от 2 до 4 млн ₽"
  },
  {
    icon: Zap,
    title: "ЛЭП оказалась слишком близко",
    description:
      "Банк отказал в ипотеке, нотариус не пропустил сделку. Пришлось продавать участок со скидкой 25–35%.",
    loss: "от 1 до 3 млн ₽"
  },
  {
    icon: MapPin,
    title: "Генплан не позволяет ИЖС",
    description:
      "По генплану и ПЗЗ участок относится к сельхозземлям или зелёной зоне. Разрешение на дом не получить.",
    loss: "от 1,5 до 3,5 млн ₽"
  },
  {
    icon: Droplet,
    title: "Подтопление и опасный рельеф",
    description:
      "Весной участок уходит под воду или начинается оползень. Фундамент трескается уже в первый год.",
    loss: "от 1,5 до 4 млн ₽"
  }
];

export function MistakesSection() {
  return (
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-4xl">
          <h2 className="text-balance text-[40px] font-bold leading-[1.12] tracking-tight text-black sm:text-[48px] lg:text-[52px]">
            Каждый месяц люди теряют 1–5 млн ₽ на участках, которые казались
            идеальными
          </h2>
          <p className="mt-4 text-[18px] font-normal leading-relaxed text-[#6b7280] sm:text-[20px]">
            Вот 4 самые частые ошибки, которые мы находим до того, как вы
            потеряете деньги
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((item) => (
            <article
              key={item.title}
              className="flex h-full min-h-[260px] flex-col rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:min-h-[280px] sm:p-7"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center text-[#2563eb]">
                <item.icon className="h-12 w-12" strokeWidth={1.5} />
              </div>
              <h3 className="text-[20px] font-bold leading-snug text-slate-800">
                {item.title}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#6b7280] sm:text-base">
                {item.description}
              </p>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-sm text-[#6b7280]">
                  Реальная потеря: {item.loss}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
