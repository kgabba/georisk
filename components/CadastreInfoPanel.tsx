"use client";

import type { Ref } from "react";
import type { CadastreSummary } from "@/lib/cadastre";
import { useContactAdminModal } from "@/components/ContactAdminModal";

type CadastreInfoPanelProps = {
  summary: CadastreSummary | null;
  rawProperties: Record<string, unknown> | null;
  /** Якорь для прокрутки к кнопке «Проверить риски» (мобильная карта). */
  ctaRowRef?: Ref<HTMLDivElement>;
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

/** Склонение для целого числа соток (1 сотка, 2–4 сотки, 5+ и 11–14 — соток). */
function pluralSotokWord(n: number): string {
  const k = Math.abs(Math.trunc(n)) % 100;
  const k10 = k % 10;
  if (k >= 11 && k <= 14) return "соток";
  if (k10 === 1) return "сотка";
  if (k10 >= 2 && k10 <= 4) return "сотки";
  return "соток";
}

function formatAreaM2AndSotok(m2: number): string {
  const mStr = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(m2));
  const sotok = m2 / 100;
  const rounded = Math.round(sotok);
  const isWhole = Math.abs(sotok - rounded) < 1e-6;

  let sPart: string;
  if (isWhole) {
    const word = pluralSotokWord(rounded);
    const numStr = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(rounded);
    sPart = `${numStr} ${word}`;
  } else {
    const numStr = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(sotok);
    sPart = `${numStr} соток`;
  }

  return `${mStr} м² (${sPart})`;
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

export function CadastreInfoPanel({ summary, rawProperties, ctaRowRef }: CadastreInfoPanelProps) {
  const { openContactModal } = useContactAdminModal();

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

      <div
        ref={ctaRowRef}
        className="mt-5 flex flex-col items-center gap-3 border-t border-emerald-100/80 pt-4 sm:flex-row sm:items-center sm:gap-5"
      >
        <button
          type="button"
          onClick={openContactModal}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-geoblue px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600"
        >
          Проверить риски участка
        </button>
        <p className="max-w-xl text-center text-sm leading-snug text-slate-500 sm:flex-1 sm:text-left">
          Получите отчёт с рисками и рекомендациями перед сделкой (
          <a
            href="#report-example"
            className="text-slate-600 underline decoration-slate-400 underline-offset-2 transition hover:text-geoblue"
          >
            пример отчёта
          </a>
          ).
        </p>
      </div>
    </div>
  );
}
