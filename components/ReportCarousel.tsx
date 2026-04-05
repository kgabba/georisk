"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLightboxIndex((i) =>
          i === null ? null : (i - 1 + cards.length) % cards.length
        );
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setLightboxIndex((i) => (i === null ? null : (i + 1) % cards.length));
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex]);

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

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={[
          "relative z-0 flex snap-x snap-mandatory gap-1 overflow-x-auto overflow-y-visible px-2 pt-12 pb-12 sm:px-3 sm:pt-14 sm:pb-14",
          "scroll-smooth",
          "[overscroll-behavior-x:contain]",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ].join(" ")}
      >
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
            onClick={() => setLightboxIndex(idx)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLightboxIndex(idx);
              }
            }}
            role="button"
            tabIndex={0}
            animate={{ scale, opacity }}
            transition={{ duration: 0.34, ease: "easeOut" }}
            className={[
              "snap-center shrink-0",
              cardBasisClass,
              "relative cursor-pointer",
              idx === 0 ? "origin-left" : "origin-center",
              isFocused ? "z-30" : "z-10",
              "rounded-2xl bg-white shadow-md ring-1 ring-black/5",
              "outline-none focus-visible:ring-2 focus-visible:ring-geoblue focus-visible:ring-offset-2"
            ].join(" ")}
            aria-label={`${card.title}. Нажмите, чтобы открыть крупно`}
          >
            <div className="relative aspect-[210/297] w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
              <Image
                src={card.imageSrc}
                alt=""
                width={SLIDE_WIDTH}
                height={SLIDE_HEIGHT}
                className="h-full w-full object-cover object-top"
                sizes="(max-width: 640px) 55vw, (max-width: 1024px) 39vw, 25vw"
                priority={idx === 0}
                aria-hidden
              />
            </div>
          </motion.article>
        ))}
      </div>

      {lightboxIndex !== null ? (
        <div
          className="fixed inset-0 z-[45] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-lightbox-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            aria-label="Закрыть просмотр"
            onClick={() => setLightboxIndex(null)}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute right-3 top-3 z-20 rounded-full bg-white/12 p-2.5 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:right-4 sm:top-4"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) =>
                i === null ? null : (i - 1 + cards.length) % cards.length
              );
            }}
            className="absolute z-20 rounded-full bg-white/12 p-2.5 text-white ring-1 ring-white/20 transition hover:bg-white/20 max-md:bottom-7 max-md:left-5 max-md:top-auto max-md:translate-y-0 md:bottom-auto md:left-3 md:top-1/2 md:-translate-y-1/2 md:p-3"
            aria-label="Предыдущий слайд"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((i) => (i === null ? null : (i + 1) % cards.length));
            }}
            className="absolute z-20 rounded-full bg-white/12 p-2.5 text-white ring-1 ring-white/20 transition hover:bg-white/20 max-md:bottom-7 max-md:right-5 max-md:top-auto max-md:translate-y-0 md:bottom-auto md:right-3 md:top-1/2 md:-translate-y-1/2 md:p-3"
            aria-label="Следующий слайд"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
          </button>

          <h2 id="report-lightbox-title" className="sr-only">
            {cards[lightboxIndex]!.title}
          </h2>

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-12 py-10 max-md:px-3 max-md:pb-24 max-md:pt-10 sm:px-16 sm:py-12">
            <div
              className="pointer-events-auto relative max-md:h-[min(100dvh,calc(98vw*297/210))] max-md:w-[min(98vw,calc(100dvh*210/297))] md:h-[min(92dvh,calc(94vw*297/210))] md:w-[min(94vw,calc(92dvh*210/297))]"
              onMouseDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              <Image
                key={cards[lightboxIndex]!.imageSrc}
                src={cards[lightboxIndex]!.imageSrc}
                alt=""
                fill
                className="rounded-2xl object-contain object-center shadow-2xl ring-1 ring-white/15"
                sizes="(max-width: 767px) 98vw, 94vw"
                draggable={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

