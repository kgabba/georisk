"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinned } from "lucide-react";

/** Единый размер иконок в шапке (px) */
const ICON_PX = 38;

const iconLinkClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:opacity-90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-geoblue";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-emerald-100/70 bg-mint-50/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="#top" className="flex min-w-0 items-center gap-2 text-slate-900">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
            <MapPinned className="h-5 w-5" />
          </div>
          <span className="truncate text-lg font-semibold tracking-tight">GeoRisk</span>
        </Link>

        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
          <p className="max-w-[6.5rem] text-right text-[11px] font-medium leading-snug tracking-tight text-slate-600 sm:max-w-[12rem] sm:text-sm md:max-w-[14rem]">
            Дадим{" "}
            <span className="font-semibold text-slate-900">моментальный ответ</span>
          </p>

          <nav
            className="flex items-center gap-0.5 sm:gap-1"
            aria-label="Связаться: Telegram, ВКонтакте, Max"
          >
            <a
              href="https://t.me/pulya102"
              target="_blank"
              rel="noopener noreferrer"
              className={iconLinkClass}
              aria-label="Написать в Telegram @pulya102"
              title="Telegram: @pulya102"
            >
              <Image
                src="/icons/telegram.png"
                alt=""
                width={ICON_PX}
                height={ICON_PX}
                className="h-9 w-9 object-contain sm:h-[38px] sm:w-[38px]"
                priority
              />
            </a>

            <a
              href="https://vk.com/id52806555"
              target="_blank"
              rel="noopener noreferrer"
              className={iconLinkClass}
              aria-label="ВКонтакте"
              title="ВКонтакте"
            >
              <Image
                src="/icons/vk.png"
                alt=""
                width={ICON_PX}
                height={ICON_PX}
                className="h-9 w-9 object-contain sm:h-[38px] sm:w-[38px]"
              />
            </a>

            <a
              href="tel:+79167982259"
              className={iconLinkClass}
              aria-label="Позвонить или связаться через Max, телефон +7 916 798-22-59"
              title="Max / +7 916 798-22-59"
            >
              <Image
                src="/icons/max.png"
                alt=""
                width={ICON_PX}
                height={ICON_PX}
                className="h-9 w-9 object-contain sm:h-[38px] sm:w-[38px]"
              />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
