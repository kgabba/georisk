"use client";

import Link from "next/link";
import { MapPinned, Phone } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-emerald-100/70 bg-mint-50/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="#top" className="flex items-center gap-2 text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
              <MapPinned className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">GeoRisk</span>
          </Link>

          <div className="hidden items-center md:flex md:ml-6 lg:ml-8">
            <a
              href="tel:+79167982259"
              className="inline-flex items-center gap-2 whitespace-nowrap"
              aria-label="Позвонить +7 (916) 798-22-59"
            >
              <Phone className="h-[18px] w-[18px] text-slate-800" />
              {/* ЗДЕСЬ МЕНЯТЬ НОМЕР ТЕЛЕФОНА */}
              <span className="text-base font-semibold text-[#1a1a1a]">
                +7 (916) 798-22-59
              </span>
              <span className="text-sm text-[#666666]">Бесплатная консультация</span>
            </a>
          </div>

          {/* ЗДЕСЬ МЕНЯТЬ @НИК TELEGRAM */}
          <a
            href="https://t.me/pulya102"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 md:ml-4"
          >
            <span>Написать в Telegram</span>
          </a>
        </div>

        <a
          href="tel:+79167982259"
          className="mt-2 inline-flex items-center gap-2 md:hidden"
          aria-label="Позвонить +7 (916) 798-22-59"
        >
          <Phone className="h-4 w-4 text-slate-800" />
          <span className="text-[15px] font-semibold text-[#1a1a1a]">+7 (916) 798-22-59</span>
          <span className="text-[13px] text-[#666666]">Бесплатная консультация</span>
        </a>
      </div>
    </header>
  );
}
