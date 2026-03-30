"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Zap, Landmark, MapPinned } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Скорость",
    text: "Юрист 3–7 дней → GeoRisk 24 часа"
  },
  {
    icon: Landmark,
    title: "Стоимость",
    text: "Юрист 10–40 тыс. ₽ → GeoRisk 870 ₽"
  },
  {
    icon: MapPinned,
    title: "Понятность отчёта",
    text: "Сложный юридический текст → простой PDF с картами и рекомендациями"
  }
] as const;

function GeoIllustration({ inView }: { inView: boolean }) {
  // простая “карта” в SVG: полигон + слои
  const polygon =
    "M80 90 L200 50 L320 120 L290 240 L130 260 L65 170 Z";

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-slate-200/70 bg-white/60 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.10),_transparent_60%)]" />

        <svg
          className="relative h-full w-full"
          viewBox="0 0 400 320"
          role="img"
          aria-label="Иллюстрация слоёв геозон"
        >
          {/* исходный полигон */}
          <path
            d={polygon}
            fill="rgba(37,99,235,0.08)"
            stroke="rgba(37,99,235,0.45)"
            strokeWidth="2"
          />

          {/* слои (появляются через анимацию wrapper'ов ниже) */}
          {/* green layer */}
          <motion.g
            initial={{ opacity: 0, scale: 0.98 }}
            animate={
              inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }
            }
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.0 }}
          >
            <path
              d={polygon}
              fill="rgba(16,185,129,0.14)"
              stroke="rgba(16,185,129,0.35)"
              strokeWidth="1.5"
            />
          </motion.g>

          {/* blue layer */}
          <motion.g
            initial={{ opacity: 0, scale: 0.98 }}
            animate={
              inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }
            }
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.12 }}
          >
            <path
              d="M110 105 L205 72 L298 132 L280 225 L150 240 L95 175 Z"
              fill="rgba(59,130,246,0.12)"
              stroke="rgba(59,130,246,0.30)"
              strokeWidth="1.4"
            />
          </motion.g>

          {/* orange layer */}
          <motion.g
            initial={{ opacity: 0, scale: 0.98 }}
            animate={
              inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }
            }
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.24 }}
          >
            <path
              d="M140 120 L215 95 L260 150 L248 200 L175 208 L130 160 Z"
              fill="rgba(245,158,11,0.10)"
              stroke="rgba(245,158,11,0.35)"
              strokeWidth="1.4"
            />
          </motion.g>

          {/* маркеры риска */}
          <motion.g
            initial={{ opacity: 0, y: 6 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.18 }}
          >
            <circle cx="205" cy="110" r="7" fill="rgba(239,68,68,0.95)" />
            <circle cx="235" cy="165" r="6" fill="rgba(249,115,22,0.95)" />
            <circle cx="160" cy="185" r="6" fill="rgba(239,68,68,0.9)" />
          </motion.g>
        </svg>

        {/* подпись снизу с маленькой стрелкой */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/55 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="text-slate-900 font-semibold text-sm whitespace-nowrap">
              →
            </div>
            <div className="text-slate-700 text-sm font-medium">
              Готовый PDF-отчёт с рекомендациями
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhyGeoRiskInstead() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <section className="bg-transparent px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div
          ref={ref}
          className="grid grid-cols-1 gap-0 rounded-none overflow-hidden border border-emerald-100/60 bg-mint-50 sm:grid-cols-[3fr_2fr]"
        >
          {/* Левая колонка */}
          <div className="bg-slate-900 px-6 py-10 sm:px-10">
            <div className="space-y-6">
              <h2 className="text-balance text-[40px] font-bold leading-[1.08] tracking-tight text-white sm:text-[48px]">
                Зачем платить юристу 10–40 тыс. ₽, если можно получить то
                же самое за 870 ₽?
              </h2>
              <p className="mt-1 max-w-2xl text-[18px] leading-relaxed text-slate-200">
                Мы делаем именно то, за что юристы берут большие деньги — только быстрее, дешевле и понятнее.
              </p>

              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#2563eb] ring-1 ring-white/10 shadow-sm">
                    <b.icon className="h-6 w-6" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {b.title}
                    </div>
                    <div className="mt-1 text-base text-slate-200 leading-relaxed">
                      {b.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Правая колонка */}
          <div className="relative bg-white/40 px-6 py-10 sm:px-10">
            <div className="relative">
              {/* анимируем появление “слоёв” */}
              <GeoIllustration inView={inView} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

