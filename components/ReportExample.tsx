"use client";

import { ReportCarousel } from "@/components/ReportCarousel";

export function ReportExample() {
  return (
    <section
      id="report-example"
      className="order-2 bg-transparent px-4 pb-8 pt-10 max-md:-mt-1 max-md:pt-6 sm:px-6 sm:pb-10 md:order-5 md:pt-10"
    >
      <div className="mx-auto max-w-6xl overflow-x-visible overflow-y-visible">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
            Как выглядит отчёт GeoRisk
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Вы получаете понятный PDF-отчёт с картами, оценкой рисков по
            категориям и рекомендациями.
          </p>
        </div>

        <div className="mt-1 max-md:mt-0 sm:mt-0">
          <ReportCarousel />
        </div>
      </div>
    </section>
  );
}
