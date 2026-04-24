"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { CadastreInfoPanel } from "@/components/CadastreInfoPanel";
import type { CadastreMapCandidate, CadastreSummary } from "@/lib/cadastre";

const DynamicLeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), {
  ssr: false
});

interface MapSectionProps {
  onPolygonReady: (coords: [number, number][]) => void;
  /** Поиск ЗУ по нарисованному полигону (НСПД); результат — панель кадастра, без всплывающих контактов. */
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
}

export function MapSection({
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
}: MapSectionProps) {
  const [polygon, setPolygon] = useState<[number, number][]>([]);
  const [drawFirstHint, setDrawFirstHint] = useState<string | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);

  const handlePolygonDrawn = useCallback((coords: [number, number][]) => {
    setPolygon(coords);
    if (coords.length) setDrawFirstHint(null);
  }, []);

  async function handleCheckClick() {
    setDrawFirstHint(null);
    if (onVerifyDrawnPolygon) {
      if (polygon.length < 3) {
        setDrawFirstHint(
          "Сначала замкните полигон на карте (инструмент многоугольника справа), минимум три вершины, затем нажмите снова."
        );
        return;
      }
      await onVerifyDrawnPolygon(polygon);
      return;
    }
    if (polygon.length) {
      onPolygonReady(polygon);
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

  return (
    <section
      id="desktop-map-section"
      className="relative z-10 order-2 -mt-[104px] mb-20 hidden scroll-mt-28 px-4 md:order-2 md:block md:scroll-mt-32 sm:px-6 lg:px-8"
    >
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
            <DynamicLeafletMap
              onPolygonDrawn={handlePolygonDrawn}
              focusCoords={focusCoords}
              selectedGeoFeature={selectedGeoFeature}
              cadastreCandidates={cadastreCandidates}
              onCadastreCandidateClick={onCadastreCandidateSelect}
            />
          </div>

          <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:mt-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 space-y-1.5 text-xs text-slate-500">
              {polygonPickHint ? <p className="font-medium text-amber-800">{polygonPickHint}</p> : null}
              {drawFirstHint ? <p className="font-medium text-amber-900">{drawFirstHint}</p> : null}
              {polygonSearchError ? <p className="text-red-600">{polygonSearchError}</p> : null}
              {placeSearchError ? <p className="text-red-600">{placeSearchError}</p> : null}
              <div className="flex w-full flex-col gap-2 pt-0.5 sm:flex-row">
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
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-geoblue"
                />
                <button
                  type="button"
                  onClick={() => void handlePlaceSearch()}
                  disabled={placeSearchLoading}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
                >
                  {placeSearchLoading ? "Ищем…" : "Найти место"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCheckClick}
              disabled={polygonSearchLoading}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-geoblue px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-60"
            >
              {polygonSearchLoading ? "Ищем…" : "Найти участок"}
            </button>
          </div>

          <CadastreInfoPanel
            summary={cadastreSummary}
            rawProperties={cadastreRawProperties}
            cadastreFeature={cadastreFeature}
          />
        </div>
      </div>
    </section>
  );
}
