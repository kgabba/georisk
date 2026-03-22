"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinned } from "lucide-react";

/** Единый размер иконок в шапке (px) — меняй здесь, если нужно крупнее/мельче */
const ICON_PX = 36;

const iconLinkClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-geoblue";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-emerald-100/70 bg-mint-50/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-18 sm:px-6 lg:px-8">
        <Link href="#top" className="flex items-center gap-2 text-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
            <MapPinned className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">GeoRisk</span>
        </Link>

        <nav
          className="flex items-center gap-1 sm:gap-2"
          aria-label="Связаться"
        >
          {/* Telegram — открывает чат с @pulya102 */}
          <a
            href="https://t.me/pulya102"
            target="_blank"
            rel="noopener noreferrer"
            className={iconLinkClass}
            aria-label="Написать в Telegram"
            title="Telegram: @pulya102"
          >
            <Image
              src="/icons/telegram.png"
              alt=""
              width={ICON_PX}
              height={ICON_PX}
              className="h-9 w-9 object-contain"
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
              className="h-9 w-9 object-contain"
            />
          </a>

          {/* MAX: пока нет публичной ссылки на профиль — звонок/сохранение номера.
              Когда появится ссылка вида https://max.ru/... — замени href ниже */}
          <a
            href="tel:+79167982259"
            className={iconLinkClass}
            aria-label="Позвонить или написать в Max (номер)"
            title="Max / телефон +7 916 798-22-59"
          >
            <Image
              src="/icons/max.png"
              alt=""
              width={ICON_PX}
              height={ICON_PX}
              className="h-9 w-9 object-contain"
            />
          </a>
        </nav>
      </div>
    </header>
  );
}
