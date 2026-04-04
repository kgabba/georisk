"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

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
          className="fixed inset-0 z-[45] flex items-center justify-center p-4 sm:p-6"
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

          <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-[min(88vw,56rem)] flex-col items-center overflow-y-auto overscroll-contain">
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-0 top-0 z-20 rounded-full bg-white/12 p-2.5 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:-right-1 sm:-top-1"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            <h2 id="report-lightbox-title" className="sr-only">
              {cards[lightboxIndex]!.title} — фрагмент отчёта
            </h2>

            <div className="relative mt-10 h-[min(76vh,calc(86vw*297/210))] w-[min(86vw,calc(76vh*210/297))] shrink-0 sm:mt-8">
              <Image
                src={cards[lightboxIndex]!.imageSrc}
                alt=""
                fill
                className="rounded-2xl object-contain object-center shadow-2xl ring-1 ring-white/15"
                sizes="(max-width: 768px) 86vw, min(86vw, 56rem)"
              />
            </div>

            <p className="mt-4 max-w-md text-center text-sm leading-snug text-white/90 sm:mt-5 sm:text-base">
              Фрагмент реального PDF-отчёта GeoRisk. Получите полный документ по вашему участку за пару минут.
            </p>
            <a
              href="#lead-form"
              onClick={() => setLightboxIndex(null)}
              className="mt-3 mb-1 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-emerald-50"
            >
              Получить отчёт по моему участку
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

