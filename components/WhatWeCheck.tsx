"use client";

import { Waves, Zap, Trees, Mountain, CloudRain, Landmark } from "lucide-react";

const items = [
  {
    icon: Waves,
    title: "Водоохранные зоны",
    description: "Проверяем, попадает ли участок в водоохранные зоны и прибрежные полосы."
  },
  {
    icon: Zap,
    title: "ЛЭП и охранные зоны",
    description: "Оцениваем влияние линий электропередач и их ограничений на застройку."
  },
  {
    icon: Trees,
    title: "ООПТ и лесной фонд",
    description: "Выявляем особо охраняемые природные территории и лесные участки."
  },
  {
    icon: Mountain,
    title: "Уклон и рельеф",
    description: "Анализируем уклоны, карст и оползневую опасность рельефа."
  },
  {
    icon: CloudRain,
    title: "Подтопление",
    description: "Оцениваем риски подтопления по многолетним данным и моделям."
  },
  {
    icon: Landmark,
    title: "Соответствие генплану",
    description: "Проверяем запреты на строительство по генплану."
  }
];

export function WhatWeCheck() {
  return (
    <section
      id="what-we-check"
      className="order-3 bg-transparent px-4 pb-16 pt-4 max-md:scroll-mt-24 sm:px-6 md:order-4 md:scroll-mt-0 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Что именно мы проверяем</h2>
            <p className="mt-2 text-base text-slate-600">Соединяем кадастр, картографию и профильные геоданные.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-row gap-4 rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-emerald-50 max-md:items-center sm:flex-col sm:gap-0 sm:p-6"
            >
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:mb-4 sm:self-auto">
                <item.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 sm:flex-none">
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600 sm:mt-2">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
