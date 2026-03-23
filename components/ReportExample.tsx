"use client";

import { ReportCarousel } from "@/components/ReportCarousel";

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

        <div className="mt-8">
          <ReportCarousel />
        </div>
      </div>
    </section>
  );
}
