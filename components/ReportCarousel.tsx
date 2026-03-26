"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type ReportCard = {
  title: string;
};

const cards: ReportCard[] = [
  { title: "Титульный лист + Risk Score" },
  { title: "Карта участка со всеми зонами" },
  { title: "Подробный разбор рисков (список с иконками)" },
  { title: "Рекомендации и вердикт" },
  { title: "Пример для банка/нотариуса" }
];

export function ReportCarousel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const focusedIndex = hoveredIndex ?? activeIndex;

  const cardBasisClass = "basis-[84%] sm:basis-[58%] lg:basis-[38%]";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      const children = Array.from(container.children) as HTMLElement[];
      if (!children.length) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let nearest = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      children.forEach((child, idx) => {
        const rect = child.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(center - containerCenter);
        if (dist < bestDist) {
          bestDist = dist;
          nearest = idx;
        }
      });

      setActiveIndex((prev) => (prev === nearest ? prev : nearest));
    };

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const renderedCards = useMemo(
    () =>
      cards.map((card, idx) => {
        const distance = Math.abs(idx - focusedIndex);
        const scale =
          distance === 0 ? 1.22 : distance === 1 ? 0.9 : 0.85;
        const opacity =
          distance === 0 ? 1 : distance === 1 ? 0.8 : 0.75;

        return { card, idx, scale, opacity };
      }),
    [focusedIndex]
  );

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={[
          "flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-4 sm:px-3",
          "scroll-smooth",
          "[overscroll-behavior-x:contain]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ].join(" ")}
      >
        {renderedCards.map(({ card, idx, scale, opacity }) => (
          <motion.article
            key={card.title}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            animate={{ scale, opacity }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className={[
              "snap-center shrink-0",
              cardBasisClass,
              "origin-center",
              "rounded-2xl bg-white shadow-md ring-1 ring-black/5"
            ].join(" ")}
            aria-label={card.title}
          >
            <div className="relative overflow-hidden rounded-2xl">
              <div className="aspect-[4/3] w-full bg-[linear-gradient(135deg,#eaf7f1_0%,#f0f7f4_45%,#e6eefc_100%)] p-4 sm:p-5">
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm">
                  <Plus className="h-4 w-4 text-slate-700" />
                </div>

                <div className="flex h-full items-center justify-center">
                  {/* Лист A4 с острыми углами */}
                  <div className="aspect-[210/297] h-[94%] border border-slate-300/90 bg-white/85 p-3 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                      Страница {idx + 1}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                <h3 className="text-[15px] font-semibold leading-snug text-slate-900 sm:text-base">
                  {card.title}
                </h3>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-mint-50 to-transparent sm:w-12" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-mint-50 to-transparent sm:w-12" />
    </div>
  );
}

