"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useContactAdminModal } from "@/components/ContactAdminModal";

const MobileMapGeomanInner = dynamic(
  () => import("./MobileMapGeomanInner").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-[400px] w-full animate-pulse rounded-2xl bg-slate-100" /> }
);

type MobileMapSectionProps = {
  onPolygonReady: (coords: [number, number][]) => void;
};

export function MobileMapSection({ onPolygonReady }: MobileMapSectionProps) {
  const { openContactModal } = useContactAdminModal();
  const [isNarrow, setIsNarrow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    function sync() {
      setIsNarrow(mq.matches);
    }
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const handlePolygonChange = useCallback((nextCoords: [number, number][], _gj: GeoJSON.Feature | null) => {
    setCoords(nextCoords);
  }, []);

  function handleCheck() {
    if (coords.length) {
      onPolygonReady(coords);
    }
    openContactModal();
  }

  if (!mounted || !isNarrow) return null;

  return (
    <section
      id="mobile-map-section"
      className="order-5 bg-transparent px-4 pb-12 pt-2 max-md:scroll-mt-24 sm:px-6 lg:px-8"
      aria-label="Карта для выделения участка"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-lg font-semibold leading-snug text-slate-900">
          Вы также можете проверить участок, выделив его на карте
        </h2>
        <p className="mt-1.5 text-sm leading-snug text-slate-600">
          Если не знаете кадастровый номер — просто обведите границы участка.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/90 shadow-soft ring-1 ring-emerald-50/80">
          <MobileMapGeomanInner onPolygonChange={handlePolygonChange} />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleCheck}
            className="inline-flex w-full items-center justify-center rounded-xl bg-geoblue px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 sm:w-auto sm:self-start"
          >
            Проверить
          </button>
        </div>
      </div>
    </section>
  );
}
