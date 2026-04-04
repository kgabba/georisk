"use client";

import { ReportCarousel } from "@/components/ReportCarousel";

export function ReportExample() {
  return (
    <section className="overflow-visible bg-transparent px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-x-visible overflow-y-visible">
        <div className="relative z-[1]">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Как выглядит отчёт GeoRisk
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Вы получаете понятный PDF-отчёт с картами, оценкой рисков по
            категориям и рекомендациями.
          </p>
        </div>

        {/* Выше к заголовку; z выше — увеличенные карточки перекрывают заголовок, не режутся сверху */}
        <div className="relative z-[15] -mt-5 overflow-visible sm:-mt-6">
          <ReportCarousel />
        </div>
      </div>
    </section>
  );
}
