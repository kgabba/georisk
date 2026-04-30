"use client";

import Link from "next/link";
import { BUSINESS_FULL_NAME, BUSINESS_INN, BUSINESS_STATUS } from "@/lib/business";
import { SITE_TELEGRAM_URL } from "@/lib/contact";

export function Footer() {
  const parts = BUSINESS_FULL_NAME.trim().split(/\s+/).filter(Boolean);
  const lastName = parts[0] ?? BUSINESS_FULL_NAME;
  const initials = parts
    .slice(1, 3)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}.`)
    .join("");
  const legalName = initials ? `${lastName} ${initials}` : lastName;

  return (
    <footer className="border-t border-emerald-100 bg-mint-50/90 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} GeoRisk. Все права защищены.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/requisites" className="text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline">
              Реквизиты
            </Link>
            <Link href="/offer" className="text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline">
              Оферта
            </Link>
            <a
              href={SITE_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Связаться в Telegram
            </a>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-600/90">
          {BUSINESS_STATUS} {legalName}, ИНН {BUSINESS_INN}
        </p>
      </div>
    </footer>
  );
}
