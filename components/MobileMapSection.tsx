"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { CadastreInfoPanel } from "@/components/CadastreInfoPanel";
import type { CadastreMapCandidate, CadastreSummary } from "@/lib/cadastre";

const MobileMapGeomanInner = dynamic(
  () => import("./MobileMapGeomanInner").then((m) => m.default),
  { ssr: false, loading: () => <div className="h-[400px] w-full animate-pulse rounded-2xl bg-slate-100" /> }
);

type MobileMapSectionProps = {
  onPolygonReady: (coords: [number, number][]) => void;
  onVerifyDrawnPolygon?: (ring: [number, number][]) => Promise<void>;
  cadastreCandidates?: CadastreMapCandidate[] | null;
  onCadastreCandidateSelect?: (code: string) => void;
  polygonSearchLoading?: boolean;
  polygonSearchError?: string | null;
  polygonPickHint?: string | null;
  selectedGeoFeature?: GeoJSON.Feature | null;
  cadastreSummary?: CadastreSummary | null;
  cadastreRawProperties?: Record<string, unknown> | null;
};

export function MobileMapSection({
  onPolygonReady,
  onVerifyDrawnPolygon,
  cadastreCandidates = null,
  onCadastreCandidateSelect,
  polygonSearchLoading = false,
  polygonSearchError = null,
  polygonPickHint = null,
  selectedGeoFeature = null,
  cadastreSummary = null,
  cadastreRawProperties = null
}: MobileMapSectionProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [drawFirstHint, setDrawFirstHint] = useState<string | null>(null);

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

  const handlePolygonChange = useCallback((nextCoords: [number, number][], geojson: GeoJSON.Feature | null) => {
    void geojson;
    setCoords(nextCoords);
    if (nextCoords.length) setDrawFirstHint(null);
  }, []);

  async function handleCheck() {
    setDrawFirstHint(null);
    if (onVerifyDrawnPolygon) {
      if (coords.length < 3) {
        setDrawFirstHint(
          "Сначала нарисуйте и замкните полигон на карте (кнопка многоугольника справа), затем нажмите «Проверить» снова."
        );
        return;
      }
      await onVerifyDrawnPolygon(coords);
      return;
    }
    if (coords.length) {
      onPolygonReady(coords);
    }
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
          <MobileMapGeomanInner
            onPolygonChange={handlePolygonChange}
            selectedGeoFeature={selectedGeoFeature}
            cadastreCandidates={cadastreCandidates}
            onCadastreCandidateClick={onCadastreCandidateSelect}
          />
        </div>

        <div className="mt-4 space-y-2">
          {polygonPickHint ? (
            <p className="text-sm font-medium text-amber-800">{polygonPickHint}</p>
          ) : null}
          {drawFirstHint ? <p className="text-sm font-medium text-amber-900">{drawFirstHint}</p> : null}
          {polygonSearchError ? <p className="text-sm text-red-600">{polygonSearchError}</p> : null}
          <button
            type="button"
            onClick={handleCheck}
            disabled={polygonSearchLoading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-geoblue px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-60 sm:w-auto sm:self-start"
          >
            {polygonSearchLoading ? "Проверяем…" : "Проверить"}
          </button>
        </div>

        <CadastreInfoPanel summary={cadastreSummary} rawProperties={cadastreRawProperties} />
      </div>
    </section>
  );
}
