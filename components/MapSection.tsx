"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { trackEvent } from "@/lib/track";

const DynamicLeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), {
  ssr: false
});

interface MapSectionProps {
  onPolygonReady: (coords: [number, number][]) => void;
}

export function MapSection({ onPolygonReady }: MapSectionProps) {
  const [polygon, setPolygon] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);

  const handlePolygonDrawn = useCallback((coords: [number, number][]) => {
    setPolygon(coords);
  }, []);

  async function handleCheckClick() {
    if (!polygon.length) return;

    setLoading(true);
    await trackEvent({
      timestamp: new Date().toISOString(),
      polygon_coords: polygon,
      source: "map"
    });
    setLoading(false);

    onPolygonReady(polygon);
    document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="relative z-10 -mt-[104px] mb-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-white/90 px-4 pb-4 pt-3 shadow-soft ring-1 ring-emerald-50 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="mb-2.5 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="text-base font-semibold leading-snug text-slate-900 sm:text-xl">
              Выделите участок на карте и проверьте все риски
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm sm:max-w-[23rem]">
              Приблизьте карту и обведите границы участка.
            </p>
          </div>

          {/* чуть поднимаем карту вверх в лендинге */}
          <div className="-mt-[14px]">
            <DynamicLeafletMap onPolygonDrawn={handlePolygonDrawn} />
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:mt-5 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500">После отрисовки полигона нажмите кнопку, чтобы перейти к заявке.</p>
            <button
              type="button"
              disabled={!polygon.length || loading}
              onClick={handleCheckClick}
              className="inline-flex items-center justify-center rounded-full bg-geoblue px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Проверяем участок..." : "Проверить этот участок"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
