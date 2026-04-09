"use client";

import type { CadastreSummary } from "@/lib/cadastre";

type CadastreInfoPanelProps = {
  summary: CadastreSummary | null;
  rawProperties: Record<string, unknown> | null;
};

function formatValue(value: number | string | null) {
  if (value === null || value === "") return "—";
  if (typeof value === "number") return new Intl.NumberFormat("ru-RU").format(value);
  return value;
}

export function CadastreInfoPanel({ summary, rawProperties }: CadastreInfoPanelProps) {
  if (!summary) return null;

  return (
    <div className="mt-4 rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-soft ring-1 ring-emerald-50">
      <h3 className="text-base font-semibold text-slate-900">Данные участка</h3>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-medium">Кадастровый номер:</span> {formatValue(summary.cadNum ?? summary.label)}
        </p>
        <p>
          <span className="font-medium">Кадастровая стоимость:</span> {formatValue(summary.costValue)}
        </p>
        <p>
          <span className="font-medium">Площадь:</span> {formatValue(summary.areaValue)}
        </p>
        <p>
          <span className="font-medium">Категория:</span> {formatValue(summary.category)}
        </p>
        <p className="sm:col-span-2">
          <span className="font-medium">Разрешенное использование:</span> {formatValue(summary.permittedUse)}
        </p>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-geoblue">Дополнительные поля НСПД</summary>
        <pre className="mt-2 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          {JSON.stringify(rawProperties ?? {}, null, 2)}
        </pre>
      </details>
    </div>
  );
}
