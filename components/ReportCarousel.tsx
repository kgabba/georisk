"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type ReportCard = {
  title: string;
  imageSrc: string;
};

/** Превью слайдов из отчет.pptx → public/report-slide-1.png … 5.png (см. npm run sync-report-slides) */
const cards: ReportCard[] = [
  { title: "Титул", imageSrc: "/report-slide-1.png" },
  { title: "Карта участка", imageSrc: "/report-slide-2.png" },
  { title: "Подробный разбор рисков", imageSrc: "/report-slide-3.png" },
  { title: "Рекомендации", imageSrc: "/report-slide-4.png" },
  { title: "Справка для банка/нотариуса", imageSrc: "/report-slide-5.png" }
];

const SLIDE_WIDTH = 1241;
const SLIDE_HEIGHT = 1754;

export function ReportCarousel() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Увеличено на ~10% относительно текущего состояния
  const cardBasisClass = "basis-[55%] sm:basis-[39%] lg:basis-[25%]";

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

  const renderedCards = useMemo(
    () =>
      cards.map((card, idx) => {
        if (hoveredIndex === null) {
          return { card, idx, scale: 1, opacity: 1, isFocused: false };
        }

        const isFocused = idx === hoveredIndex;
        const scale = isFocused ? 1.25 : 0.85;
        const opacity = isFocused ? 1 : 0.75;

        return { card, idx, scale, opacity, isFocused };
      }),
    [hoveredIndex]
  );

  const lastIdx = cards.length - 1;

  return (
    <div className="relative -ml-2 overflow-visible sm:-ml-3">
      {/*
        Горизонтальный скролл + большой py на том же узле: визуальный overflow от scale остаётся
        внутри padding-box и не «съедается» сверху/снизу (браузер иначе сводит overflow-y к auto).
      */}
      <div
        ref={containerRef}
        className={[
          "relative z-0 overflow-x-auto overflow-y-hidden py-28 sm:py-32",
          "scroll-smooth scroll-pl-3 scroll-pr-2 sm:scroll-pl-4 sm:scroll-pr-3",
          "[overscroll-behavior-x:contain]",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ].join(" ")}
      >
        <div className="flex w-max snap-x snap-mandatory gap-1 pl-3 pr-2 sm:pl-4 sm:pr-3">
        {renderedCards.map(({ card, idx, scale, opacity, isFocused }) => (
          <motion.article
            key={card.imageSrc}
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
            style={{
              transformOrigin:
                idx === 0
                  ? "left center"
                  : idx === lastIdx
                    ? "right center"
                    : "center center"
            }}
            className={[
              "snap-center shrink-0",
              cardBasisClass,
              "relative",
              isFocused ? "z-30" : "z-10",
              "rounded-2xl bg-white shadow-md ring-1 ring-black/5"
            ].join(" ")}
            aria-label={card.title}
          >
            <div className="relative overflow-visible rounded-2xl">
              <div className="relative aspect-[210/297] w-full overflow-hidden rounded-t-2xl bg-slate-100 ring-1 ring-black/5">
                <Image
                  src={card.imageSrc}
                  alt={card.title}
                  width={SLIDE_WIDTH}
                  height={SLIDE_HEIGHT}
                  className="h-full w-full object-cover object-top"
                  sizes="(max-width: 640px) 55vw, (max-width: 1024px) 39vw, 25vw"
                  priority={idx === 0}
                />
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
      </div>
    </div>
  );
}

