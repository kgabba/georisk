"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

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
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const focusedIndex = hoveredIndex ?? activeIndex;

  // Уменьшено примерно на 40% относительно предыдущих размеров
  const cardBasisClass = "basis-[50%] sm:basis-[35%] lg:basis-[23%]";

  function scrollCardIntoView(index: number) {
    const container = containerRef.current;
    const card = cardRefs.current[index];
    if (!container || !card) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const currentLeft = container.scrollLeft;
    const deltaToCenter =
      cardRect.left +
      cardRect.width / 2 -
      (containerRect.left + containerRect.width / 2);

    container.scrollTo({
      left: Math.max(0, currentLeft + deltaToCenter),
      behavior: "smooth"
    });
  }

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
          "relative z-0 flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-visible px-2 py-12 sm:px-3",
          "scroll-smooth",
          "[overscroll-behavior-x:contain]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ].join(" ")}
      >
        {renderedCards.map(({ card, idx, scale, opacity }) => (
          <motion.article
            key={card.title}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            onMouseEnter={() => {
              setHoveredIndex(idx);
              scrollCardIntoView(idx);
            }}
            onMouseLeave={() => setHoveredIndex(null)}
            animate={{ scale, opacity }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className={[
              "snap-center shrink-0",
              cardBasisClass,
              "relative origin-center",
              idx === focusedIndex ? "z-20" : "z-10",
              "rounded-2xl bg-white shadow-md ring-1 ring-black/5"
            ].join(" ")}
            aria-label={card.title}
          >
            <div className="relative overflow-hidden rounded-2xl">
              {/* Карточка сделана более вертикальной, близко к A4 */}
              <div className="relative aspect-[210/297] w-full bg-[linear-gradient(135deg,#eaf7f1_0%,#f0f7f4_45%,#e6eefc_100%)]">
                {/* Лист A4 внутри блока: занимает ~95% площади, острые углы */}
                <div className="absolute inset-[2.5%] border border-slate-300/90 bg-white/85 p-3 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">
                    Страница {idx + 1}
                  </p>
                  <div className="mt-3 h-2 w-28 rounded bg-slate-200" />
                  <div className="mt-2 h-2 w-4/5 rounded bg-slate-200" />
                  <div className="mt-2 h-2 w-3/5 rounded bg-slate-200" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="h-12 rounded bg-slate-100" />
                    <div className="h-12 rounded bg-slate-100" />
                  </div>
                  <div className="mt-3 h-16 rounded bg-slate-100" />
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

