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
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Что именно мы проверяем</h2>
            <p className="mt-2 text-base text-slate-600">Соединяем кадастр, картографию и профильные геоданные.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="flex flex-col rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-emerald-50 sm:p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
