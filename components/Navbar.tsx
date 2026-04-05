"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL, SITE_TELEGRAM_URL } from "@/lib/contact";
import { useContactAdminModal } from "@/components/ContactAdminModal";

const MOBILE_NAV = [
  { label: "Отчёт", hash: "#report-example" },
  { label: "Проверки", hash: "#what-we-check" },
  { label: "Ошибки", hash: "#frequent-mistakes" },
  { label: "Заявка", hash: "#lead-form" },
  { label: "Тарифы", hash: "#pricing" }
] as const;

export function Navbar() {
  const { openContactModal } = useContactAdminModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen, closeMenu]);

  function scrollToHash(hash: string) {
    closeMenu();
    requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

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

          <a
            href={`tel:${SITE_PHONE_TEL}`}
            className="hidden items-center gap-2 whitespace-nowrap md:inline-flex md:ml-6 lg:ml-8"
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
            className="hidden items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 md:inline-flex md:ml-4"
          >
            <span>Написать в Telegram</span>
          </a>

          <div className="relative md:hidden" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none ring-slate-900/5 transition hover:border-slate-300 hover:shadow-md active:scale-[0.98]"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-label={menuOpen ? "Закрыть меню" : "Меню"}
            >
              <span className="h-0.5 w-[1.125rem] rounded-full bg-slate-700" />
              <span className="h-0.5 w-[1.125rem] rounded-full bg-slate-700" />
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[11.5rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-black/5"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    openContactModal();
                    closeMenu();
                  }}
                >
                  Контакты
                </button>
                <div className="mx-3 border-t border-slate-100" aria-hidden />
                {MOBILE_NAV.map((item) => (
                  <button
                    key={item.hash}
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => scrollToHash(item.hash)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
