"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SITE_TELEGRAM_URL } from "@/lib/contact";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-emerald-100/70 bg-mint-50/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="#top"
            className="inline-flex items-center gap-1 font-sans text-[1.0625rem] font-medium leading-none text-[#111827] sm:gap-1.5 sm:text-xl"
          >
            <span className="font-extrabold tracking-[-0.045em] sm:tracking-[-0.04em]">
              GeoRisk
            </span>
            <Image
              src="/logo-mark.png"
              alt=""
              width={640}
              height={640}
              className="h-[22px] w-auto shrink-0 translate-y-0 scale-[1.7] object-contain object-center mix-blend-multiply [image-rendering:crisp-edges] sm:h-[24px]"
              priority
              aria-hidden
            />
          </Link>

          <div className="hidden items-center gap-4 md:flex md:ml-6 lg:ml-8">
            <a
              href={`tel:${SITE_PHONE_TEL}`}
              className="inline-flex items-center gap-2 whitespace-nowrap"
              aria-label={`Позвонить ${SITE_PHONE_DISPLAY}`}
            >
              <Phone className="h-[18px] w-[18px] text-slate-800" />
              <span className="text-base font-semibold text-[#1a1a1a]">
                {SITE_PHONE_DISPLAY}
              </span>
              <span className="text-sm text-[#666666]">Бесплатная консультация</span>
            </a>
            <a
              href={SITE_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-slate-800"
            >
              <span>Написать в Telegram</span>
            </a>
          </div>

          <a
            href={`tel:${SITE_PHONE_TEL}`}
            className="inline-flex items-center gap-2 md:hidden"
            aria-label={`Позвонить ${SITE_PHONE_DISPLAY}`}
          >
            <Phone className="h-4 w-4 text-slate-800" />
            <span className="text-[15px] font-semibold text-[#1a1a1a]">{SITE_PHONE_DISPLAY}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
