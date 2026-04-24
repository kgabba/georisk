"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
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
  cadastreFeature?: GeoJSON.Feature | null;
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
  cadastreRawProperties = null,
  cadastreFeature = null
}: MobileMapSectionProps) {
  const [isNarrow, setIsNarrow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [drawFirstHint, setDrawFirstHint] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const cadastreCtaRowRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!cadastreSummary || !mounted || !isNarrow) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        cadastreCtaRowRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [cadastreSummary, mounted, isNarrow]);

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
          "Сначала нарисуйте и замкните полигон на карте (кнопка многоугольника справа), затем нажмите «Найти участок» снова."
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

  async function handlePlaceSearch() {
    const q = placeQuery.trim();
    if (q.length < 2) return;
    setPlaceSearchLoading(true);
    setPlaceSearchError(null);
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Ошибка поиска");
      const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!rows.length) {
        setPlaceSearchError("Ничего не найдено");
        return;
      }
      const lat = Number(rows[0].lat);
      const lon = Number(rows[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setPlaceSearchError("Некорректные координаты");
        return;
      }
      setFocusCoords([lat, lon]);
    } catch {
      setPlaceSearchError("Не удалось выполнить поиск");
    } finally {
      setPlaceSearchLoading(false);
    }
  }

  if (!mounted || !isNarrow) return null;

  return (
    <section
      id="mobile-map-section"
      className="order-5 scroll-mt-28 bg-transparent px-4 pb-12 pt-2 sm:px-6 lg:px-8"
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
            focusCoords={focusCoords}
            selectedGeoFeature={selectedGeoFeature}
            cadastreCandidates={cadastreCandidates}
            onCadastreCandidateClick={onCadastreCandidateSelect}
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handlePlaceSearch();
                }
              }}
              placeholder="Поиск населенного пункта"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-geoblue"
            />
            <button
              type="button"
              onClick={() => void handlePlaceSearch()}
              disabled={placeSearchLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
            >
              {placeSearchLoading ? "..." : "Найти"}
            </button>
          </div>
          {placeSearchError ? <p className="text-sm text-red-600">{placeSearchError}</p> : null}
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
            {polygonSearchLoading ? "Ищем…" : "Найти участок"}
          </button>
        </div>

        <CadastreInfoPanel
          summary={cadastreSummary}
          rawProperties={cadastreRawProperties}
          cadastreFeature={cadastreFeature}
          ctaRowRef={cadastreCtaRowRef}
        />
      </div>
    </section>
  );
}
