"use client";

import { useState } from "react";
import { useContactAdminModal } from "@/components/ContactAdminModal";
import { trackEvent } from "@/lib/track";

interface HeroProps {
  onCadastreCaptured: (cadastre: string) => void;
}

export function Hero({ onCadastreCaptured }: HeroProps) {
  const { openContactModal } = useContactAdminModal();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const cadastre = input.trim();
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
    <section id="top" className="relative flex min-h-screen items-center justify-center bg-mint-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.28),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(37,99,235,0.18),_transparent_55%)] opacity-70" />

      <div className="relative z-10 mt-16 flex w-full max-w-5xl flex-col items-center px-4 pb-16 pt-8 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-[72px] lg:leading-[1.05]">
            Проверьте риски участка за 30 секунд
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-base text-slate-700 sm:text-lg">
            Автоматический анализ водоохранных зон, ЛЭП, ООПТ, уклона и подтопления. Экспертный PDF-отчёт.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl space-y-3">
          <div className="hero-input flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введите кадастровый номер (например 50:21:0040211:123)"
              className="text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-geoblue px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Проверяем..." : "Проверить"}
            </button>
          </div>
          <p className="text-xs text-slate-600">или нарисуйте полигон ниже</p>
        </form>
      </div>
    </section>
  );
}
