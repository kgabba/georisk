"use client";

export function ReportExample() {
  return (
    <section className="bg-transparent px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Как выглядит отчёт GeoRisk</h2>
          <p className="mt-2 text-sm text-slate-600">
            Вы получаете понятный PDF-отчёт с картами, оценкой рисков по категориям и рекомендациями.
          </p>
        </div>

        <div className="flex-1">
          <div className="relative mx-auto max-w-md rounded-3xl bg-slate-900 p-5 text-white shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-300">GeoRisk Score (пример)</span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300">Умеренный риск</span>
            </div>
            <div className="text-4xl font-semibold leading-none">72</div>
            <p className="mt-1 text-[11px] text-slate-300">0 — высокий риск, 100 — минимальный</p>
          </div>
        </div>
      </div>
    </section>
  );
}
