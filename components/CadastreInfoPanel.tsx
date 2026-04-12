"use client";

import type { CadastreSummary } from "@/lib/cadastre";

type CadastreInfoPanelProps = {
  summary: CadastreSummary | null;
  rawProperties: Record<string, unknown> | null;
};

function getOptions(raw: Record<string, unknown> | null): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw.options;
  if (typeof o === "object" && o !== null && !Array.isArray(o)) return o as Record<string, unknown>;
  return {};
}

function strOpt(opts: Record<string, unknown>, key: string): string | null {
  const v = opts[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function numOpt(opts: Record<string, unknown>, key: string): number | null {
  const v = opts[key];
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Убирает типовой префикс НСПД, оставляет адрес после «Почтовый адрес ориентира:» при наличии. */
function cleanReadableAddress(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const marker = "Почтовый адрес ориентира:";
  if (t.includes(marker)) {
    const tail = t.split(marker)[1]?.trim();
    if (tail) return tail;
  }
  const stripped = t.replace(
    /^Местоположение установлено относительно ориентира,\s*расположенного в границах участка\.\s*/i,
    ""
  );
  return stripped.trim() || t;
}

function formatAreaM2AndSotok(m2: number): string {
  const mStr = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(m2));
  const sotok = m2 / 100;
  const sStr = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(sotok);
  return `${mStr} м² (${sStr} соток)`;
}

function formatCadastralCostRub(value: number): string {
  const rounded = Math.round(value);
  const nStr = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(rounded);
  return `${nStr} ₽`;
}

type DisplayRow = { label: string; value: string };

function buildDisplayRows(opts: Record<string, unknown>, summary: CadastreSummary): DisplayRow[] {
  const rows: DisplayRow[] = [];

  const addrRaw = strOpt(opts, "readable_address");
  if (addrRaw) {
    const cleaned = cleanReadableAddress(addrRaw);
    if (cleaned) rows.push({ label: "Адрес", value: cleaned });
  }

  const areaM2 = numOpt(opts, "specified_area") ?? numOpt(opts, "land_record_area");
  if (areaM2 != null && areaM2 > 0) {
    rows.push({ label: "Площадь", value: formatAreaM2AndSotok(areaM2) });
  }

  const cat = strOpt(opts, "land_record_category_type");
  if (cat) rows.push({ label: "Категория земель", value: cat });

  const permitted = strOpt(opts, "permitted_use_established_by_document");
  if (permitted) rows.push({ label: "Разрешённое использование", value: permitted });

  const ownership = strOpt(opts, "ownership_type");
  if (ownership) rows.push({ label: "Форма собственности", value: ownership });

  const status = strOpt(opts, "status");
  if (status) rows.push({ label: "Статус", value: status });

  const cost =
    numOpt(opts, "cost_value") ??
    (summary.costValue != null && summary.costValue > 0 ? summary.costValue : null);
  if (cost != null && cost > 0) {
    rows.push({ label: "Кадастровая стоимость", value: formatCadastralCostRub(cost) });
  }

  return rows;
}

export function CadastreInfoPanel({ summary, rawProperties }: CadastreInfoPanelProps) {
  if (!summary) return null;

  const opts = getOptions(rawProperties);
  const rows = buildDisplayRows(opts, summary);
  const cadNum = summary.cadNum ?? summary.label ?? "—";

  return (
    <div className="mt-4 rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-soft ring-1 ring-emerald-50">
      <h3 className="text-base font-semibold text-slate-900">Данные участка</h3>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-medium">Кадастровый номер:</span> {cadNum}
        </p>
        {rows.map((r) => (
          <p key={r.label}>
            <span className="font-medium">{r.label}:</span> {r.value}
          </p>
        ))}
      </div>
    </div>
  );
}
