"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";

const reportPages = [
  {
    title: "Титульный лист + Risk Score",
    subtitle: "Общий вердикт и структура отчёта"
  },
  {
    title: "Карта участка со всеми зонами",
    subtitle: "Водоохранные зоны, ЛЭП, ООПТ, уклон и подтопление"
  },
  {
    title: "Подробный разбор рисков",
    subtitle: "Категории рисков со списком и пояснениями"
  },
  {
    title: "Рекомендации и вердикт",
    subtitle: "Что делать дальше и какие шаги приоритетны"
  },
  {
    title: "Пример для банка/нотариуса",
    subtitle: "Формат отчёта для сделки и согласований"
  }
];

export function ReportExample() {
  return (
    <section className="bg-transparent px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Как выглядит отчёт GeoRisk
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Вы получаете понятный PDF-отчёт с картами, оценкой рисков по
            категориям и рекомендациями.
          </p>
        </div>

        <div className="mt-10">
          <Swiper
            modules={[Navigation]}
            navigation
            spaceBetween={20}
            slidesPerView={1.2}
            breakpoints={{
              768: { slidesPerView: 1.7 },
              1024: { slidesPerView: 2.5 }
            }}
            className="w-full"
          >
            {reportPages.map((page, i) => (
              <SwiperSlide key={i}>
                <article className="group overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(2,6,23,0.08)] ring-1 ring-black/5 transition duration-300 hover:scale-[1.02] hover:shadow-[0_18px_45px_rgba(2,6,23,0.16)]">
                  {/* Placeholder картинки страницы PDF */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[linear-gradient(135deg,#e6eefc_0%,#f0f7f4_45%,#eaf7f1_100%)]">
                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                      Страница {i + 1}
                    </div>
                    <div className="absolute inset-0 p-5">
                      <div className="h-full rounded-2xl border border-slate-200/70 bg-white/80 p-4 backdrop-blur-[1px]">
                        <div className="h-2 w-24 rounded-full bg-slate-300/90" />
                        <div className="mt-3 h-2 w-3/4 rounded-full bg-slate-200" />
                        <div className="mt-2 h-2 w-2/3 rounded-full bg-slate-200" />
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="h-16 rounded-xl bg-slate-100" />
                          <div className="h-16 rounded-xl bg-slate-100" />
                        </div>
                        <div className="mt-3 h-20 rounded-xl bg-slate-100" />
                      </div>
                    </div>
                  </div>

                  {/* Белая плашка снизу, как в Semrush */}
                  <div className="bg-white px-5 py-4">
                    <h3 className="text-[18px] font-semibold leading-snug text-slate-900">
                      {page.title}
                    </h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
                      {page.subtitle}
                    </p>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
