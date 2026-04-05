"use client";

import { useEffect, useState } from "react";
import { useContactAdminModal } from "@/components/ContactAdminModal";
import { trackEvent } from "@/lib/track";

interface HeroProps {
  onCadastreCaptured: (cadastre: string) => void;
}

const DESKTOP_PLACEHOLDER =
  "Введите кадастровый номер (например 50:21:0040211:123)";
const MOBILE_PLACEHOLDER = "например: 54:36:123456:789";

const MOBILE_SUBTITLE =
  "В один клик — PDF с проверкой ЛЭП, водоохранки, ООПТ и запретов на строительство, плюс подтопление и рельеф. Увидите риски участка до сделки.";

export function Hero({ onCadastreCaptured }: HeroProps) {
  const { openContactModal } = useContactAdminModal();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState(MOBILE_PLACEHOLDER);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    function sync() {
      setPlaceholder(mq.matches ? DESKTOP_PLACEHOLDER : MOBILE_PLACEHOLDER);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cadastre = input.trim();
    if (!cadastre) {
      openContactModal();
      return;
    }

    setLoading(true);
    await trackEvent({
      timestamp: new Date().toISOString(),
      cadastre,
      source: "hero",
      polygon_coords: null
    });
    setLoading(false);
    onCadastreCaptured(cadastre);
    openContactModal();
  }

  return (
    <section
      id="top"
      className="relative order-1 flex min-h-screen items-center justify-center bg-mint-50 md:order-1"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.28),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(37,99,235,0.18),_transparent_55%)] opacity-70" />

      <div className="relative z-10 mt-16 flex w-full max-w-5xl flex-col items-center px-4 pb-16 pt-8 text-center max-md:mt-10 max-md:pb-8 max-md:pt-3 sm:px-6 md:mt-16 md:pb-16 md:pt-8 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-3 md:space-y-6">
          <h1 className="text-balance font-semibold tracking-tight text-slate-900 max-md:text-[1.85rem] max-md:leading-[1.15] md:text-6xl lg:text-[72px] lg:leading-[1.05]">
            Проверьте риски участка за 30 секунд
          </h1>
          <p className="mx-auto hidden max-w-2xl text-balance text-base text-slate-700 md:block sm:text-lg">
            Автоматический анализ водоохранных зон, ЛЭП, ООПТ, уклона и подтопления. Экспертный PDF-отчёт.
          </p>
          <p className="mx-auto max-w-2xl text-balance text-sm leading-snug text-slate-700 max-md:block max-md:text-center md:hidden">
            {MOBILE_SUBTITLE}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 w-full max-w-2xl space-y-3 max-md:mt-6 md:mt-10"
        >
          <div className="hero-input flex max-md:flex-col max-md:gap-3 max-md:rounded-2xl max-md:border-slate-200/90 max-md:bg-white max-md:px-3 max-md:py-3 max-md:shadow-[0_8px_30px_rgba(15,23,42,0.08)] max-md:ring-1 max-md:ring-emerald-100/70 md:flex-row md:items-center md:gap-3 md:px-4 md:py-2 md:shadow-sm md:ring-0">
            <div className="min-w-0 w-full flex-1 rounded-xl bg-slate-100/95 px-3 py-2.5 ring-1 ring-slate-200/60 max-md:w-full md:rounded-full md:py-2.5 md:pl-4 md:pr-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="w-full border-none bg-transparent text-base text-slate-900 outline-none caret-geoblue max-md:text-center max-md:text-[15px] placeholder:text-slate-400 md:text-left md:text-base"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-geoblue px-5 py-3 text-sm font-medium text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70 max-md:mt-0 max-md:shadow-sm md:mt-0 md:w-auto md:rounded-full md:py-2.5 md:shadow-sm"
            >
              {loading ? "Проверяем..." : "Проверить"}
            </button>
          </div>
          <p className="hidden text-xs text-slate-600 md:block">или нарисуйте полигон ниже</p>
        </form>
      </div>
    </section>
  );
}
