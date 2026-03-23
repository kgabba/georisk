"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";

type ReportPage = {
  pill: string;
  title: string;
  subtitle?: string;
  variant: "cover" | "map" | "risks" | "recommendations" | "method";
};

const pages: ReportPage[] = [
  {
    pill: "Страница 1",
    title: "Готовый PDF‑отчёт GeoRisk",
    subtitle: "Вердикт и структура отчёта по вашему участку",
    variant: "cover"
  },
  {
    pill: "Страница 2",
    title: "Карта зон и ограничений",
    subtitle: "Наложение водоохранных зон, ЛЭП, ООПТ и подтоплений",
    variant: "map"
  },
  {
    pill: "Страница 3",
    title: "Риски по категориям",
    subtitle: "Короткие выводы по каждому фактору и что это значит",
    variant: "risks"
  },
  {
    pill: "Страница 4",
    title: "Рекомендации по действиям",
    subtitle: "Что проверить дальше и как снизить неопределённость",
    variant: "recommendations"
  },
  {
    pill: "Страница 5",
    title: "Методика и ограничения данных",
    subtitle: "Понятно, откуда берутся сведения и как их интерпретировать",
    variant: "method"
  }
];

export function ReportExample() {
  return (
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Вы получаете понятный PDF‑отчёт с картами, оценкой рисков по категориям и рекомендациями.
          </h2>
        </div>

        <div className="flex-1">
          <Swiper
            modules={[Navigation]}
            navigation
            spaceBetween={16}
            slidesPerView={1.1}
            centeredSlides
            breakpoints={{
              1024: { slidesPerView: 2.2 }
            }}
          >
            {pages.map((page, i) => (
              <SwiperSlide key={i}>
                <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-emerald-50">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                    {page.pill}
                  </div>

                  {/* “Страница PDF” — имитация макета */}
                  <div
                    className={[
                      "aspect-[210/297] w-full bg-white",
                      "relative overflow-hidden"
                    ].join(" ")}
                  >
                    <div className="absolute inset-x-0 top-0 h-2 bg-geoblue" />

                    <div className="px-5 pt-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-tight text-slate-900">
                          GeoRisk
                        </span>
                        <span className="rounded-full bg-mint-50 px-2 py-1 text-[10px] font-medium text-slate-700">
                          PDF preview
                        </span>
                      </div>

                      <h3 className="mt-3 text-[14px] font-semibold text-slate-900 leading-snug">
                        {page.title}
                      </h3>
                      {page.subtitle ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
                          {page.subtitle}
                        </p>
                      ) : null}

                      {page.variant === "cover" ? (
                        <div className="mt-4 rounded-2xl bg-mint-50 p-4">
                          <p className="text-[12px] font-medium text-slate-800">
                            Для участка: (пример)
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Кадастровый номер: 50:21:0040211:123
                          </p>
                          <div className="mt-3 flex gap-2">
                            <div className="flex-1 rounded-xl bg-white p-3 ring-1 ring-emerald-50">
                              <p className="text-[11px] font-medium text-slate-800">
                                Что будет внутри
                              </p>
                              <p className="mt-1 text-[10px] text-slate-600">
                                Карты, выводы и шаги
                              </p>
                            </div>
                            <div className="flex-1 rounded-xl bg-white p-3 ring-1 ring-emerald-50">
                              <p className="text-[11px] font-medium text-slate-800">
                                Тон отчёта
                              </p>
                              <p className="mt-1 text-[10px] text-slate-600">
                                Спокойно и по делу
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {page.variant === "map" ? (
                        <div className="mt-4 rounded-2xl bg-slate-900 p-3">
                          <div className="h-full rounded-xl bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)] p-3 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium text-emerald-200">
                                Карта ограничений
                              </span>
                              <span className="text-[10px] text-emerald-100/80">
                                пример наложения
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="h-10 rounded-lg bg-white/10" />
                              <div className="h-10 rounded-lg bg-white/10" />
                              <div className="h-10 rounded-lg bg-white/10" />
                              <div className="h-10 rounded-lg bg-white/10" />
                              <div className="h-10 rounded-lg bg-white/10" />
                              <div className="h-10 rounded-lg bg-white/10" />
                            </div>
                            <div className="mt-3 rounded-lg bg-white/10 p-2 text-[10px] text-white/80">
                              Водоохранные зоны, ЛЭП, ООПТ, уклон и подтопление
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {page.variant === "risks" ? (
                        <div className="mt-4 space-y-2">
                          <div className="rounded-2xl bg-mint-50 p-4">
                            <p className="text-[12px] font-semibold text-slate-900">
                              Что именно найдено
                            </p>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-geoblue" />
                                <p className="text-[11px] text-slate-700">
                                  Водоохранные зоны: (возможные ограничения)
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                <p className="text-[11px] text-slate-700">
                                  ЛЭП и охранные зоны: (оценка влияния)
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-amber-500" />
                                <p className="text-[11px] text-slate-700">
                                  Уклон, карст и рельеф: (что проверить дальше)
                                </p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-2 w-2 rounded-full bg-slate-600" />
                                <p className="text-[11px] text-slate-700">
                                  Подтопление: (короткий вывод)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {page.variant === "recommendations" ? (
                        <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 ring-1 ring-emerald-50">
                          <p className="text-[12px] font-semibold text-slate-900">
                            Рекомендации (пример)
                          </p>
                          <div className="space-y-2">
                            <div className="flex gap-3">
                              <span className="mt-0.5 rounded-full bg-mint-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                1
                              </span>
                              <p className="text-[11px] text-slate-700">
                                Сверьте ограничения по документам, которые действуют именно для вашей точки/границы.
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <span className="mt-0.5 rounded-full bg-mint-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                2
                              </span>
                              <p className="text-[11px] text-slate-700">
                                Уточните параметры застройки (подъезд, этажность, инженерные решения).
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <span className="mt-0.5 rounded-full bg-mint-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
                                3
                              </span>
                              <p className="text-[11px] text-slate-700">
                                Сформируйте аргументы для торга: что ограничивает риски и как их уменьшить.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {page.variant === "method" ? (
                        <div className="mt-4 rounded-2xl bg-mint-50 p-4 ring-1 ring-emerald-50">
                          <p className="text-[12px] font-semibold text-slate-900">
                            Откуда данные и как читать выводы
                          </p>
                          <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
                            GeoRisk объединяет публичные геоданные и картографические источники.
                            Мы объясняем логику интерпретации, чтобы вы уверенно принимали решения.
                          </p>
                          <div className="mt-3 h-10 rounded-xl bg-white/70" />
                        </div>
                      ) : null}
                    </div>

                    {/* подвал “PDF” */}
                    <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white/95 px-5 py-2">
                      <p className="text-[10px] text-slate-500">
                        Пример оформления. В финальном PDF будут ваши данные.
                      </p>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
