"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import type { Feature as GeoJsonFeature } from "geojson";
import "leaflet/dist/leaflet.css";
import { parcelRiskLabelsIntersecting } from "@/lib/parcel-risk-intersections";
import type { RiskMapOverlaysResponse } from "@/lib/risk-map";

type LeafletLib = typeof LeafletNS;
type LeafletMapInstance = LeafletNS.Map;
type LeafletLayer = LeafletNS.Layer;
type LeafletPathOptions = LeafletNS.PathOptions;

type StoredPayload = {
  cadastreFeature: GeoJSON.Feature;
  cadastreNumber: string | null;
};

const STORAGE_KEY = "georisk:risk-map-payload";

/** В `next dev` — Next handler + PostGIS; в prod nginx отправляет `/api/*` на Fastify (`/api/risk-map/overlays`). */
const RISK_MAP_OVERLAYS_URL =
  process.env.NODE_ENV === "development"
    ? "/dev-api/risk-map/overlays"
    : "/api/risk-map/overlays";

/** Расчёт рельефа только на Fastify; в dev Next проксирует `/api/*` на backend (см. next.config). */
const TERRAIN_NASADEM_URL = "/api/terrain/nasadem";

type NasademTerrainResponse = {
  maxSlopeDeg: number | null;
  elevationM: number | null;
  source?: string;
  scaleMeters?: number;
};

function formatMeters(m: number | null | undefined): string {
  if (m == null || !Number.isFinite(m)) return "—";
  return `${Math.round(m)} м`;
}

function formatDegrees(d: number | null | undefined): string {
  if (d == null || !Number.isFinite(d)) return "—";
  const rounded = Math.round(d * 10) / 10;
  return `${rounded}°`;
}

/** Порог «нормальный уклон» для подписи под NASADEM (градусы). */
const SLOPE_NORM_MAX_DEG = 15;
const SLOPE_MODERATE_MIN_DEG = 8;

/** На сколько уровней ближе показывать карту (как два нажатия «+»), не выше maxZoom карты слоёв. */
const RISK_MAP_EXTRA_ZOOM = 2;
const RISK_MAP_FIT_MAX_ZOOM = 18;

export default function RiskMapPage() {
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const leafletRef = useRef<LeafletLib | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layersRef = useRef<LeafletLayer[]>([]);

  const [payload, setPayload] = useState<StoredPayload | null>(null);
  const [data, setData] = useState<RiskMapOverlaysResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [terrain, setTerrain] = useState<NasademTerrainResponse | null>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);
  const [terrainNote, setTerrainNote] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const wrapped = mod as unknown as { default?: LeafletLib } & LeafletLib;
      const L = wrapped.default ?? wrapped;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
      mapRef.current = map;
      map.setView([55.75, 37.62], 14 + RISK_MAP_EXTRA_ZOOM);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri"
      }).addTo(map);
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      setMapReady(false);
      leafletRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      layersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setError("Нет выбранного участка. Вернитесь на главную и выберите кадастровый участок.");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as StoredPayload;
      if (!parsed?.cadastreFeature?.geometry) {
        throw new Error("invalid payload");
      }
      setPayload(parsed);
    } catch {
      setError("Не удалось прочитать геометрию участка для карты рисков.");
    }
  }, []);

  useEffect(() => {
    if (!payload) return;
    setLoading(true);
    setError(null);
    fetch(RISK_MAP_OVERLAYS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cadastreFeature: payload.cadastreFeature })
    })
      .then(async (res) => {
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          throw new Error(
            !res.ok
              ? `Сервер вернул ${res.status} и не JSON (часто HTML-ошибка прокси). Запрос: ${RISK_MAP_OVERLAYS_URL}`
              : "Сервер вернул не JSON (ожидался GeoJSON-ответ API). Проверьте, что для prod вызывается /api/risk-map/overlays на backend."
          );
        }
        const body = parsed as { message?: string };
        if (!res.ok) {
          throw new Error(body?.message || "Не удалось получить слои рисков.");
        }
        setData(body as RiskMapOverlaysResponse);
      })
      .catch((e: unknown) => setError(String((e as Error)?.message || e)))
      .finally(() => setLoading(false));
  }, [payload]);

  useEffect(() => {
    if (!payload?.cadastreFeature) return;
    setTerrain(null);
    setTerrainNote(null);
    setTerrainLoading(true);
    fetch(TERRAIN_NASADEM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cadastreFeature: payload.cadastreFeature })
    })
      .then(async (res) => {
        const text = await res.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          throw new Error(
            !res.ok
              ? `Рельеф: сервер вернул ${res.status} и не JSON.`
              : "Рельеф: ответ не в формате JSON."
          );
        }
        const body = parsed as { message?: string; code?: string };
        if (!res.ok) {
          if (res.status === 503 && body?.code === "GEE_NOT_CONFIGURED") {
            setTerrainNote("Рельеф NASADEM на сервере не подключён (Earth Engine).");
            return;
          }
          throw new Error(body?.message || "Не удалось получить рельеф участка.");
        }
        setTerrain(parsed as NasademTerrainResponse);
      })
      .catch((e: unknown) => setTerrainNote(String((e as Error)?.message || e)))
      .finally(() => setTerrainLoading(false));
  }, [payload]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !data || !mapReady) return;

    for (const old of layersRef.current) {
      map.removeLayer(old);
    }
    layersRef.current = [];

    const addLayer = (
      fc: GeoJSON.FeatureCollection,
      style: LeafletPathOptions,
      withPopup = false
    ) => {
      const layer = L.geoJSON(fc, {
        style: () => style,
        onEachFeature: withPopup
          ? (feature: GeoJsonFeature, layer: LeafletLayer) => {
              layer.bindPopup(
                Object.entries((feature.properties as Record<string, unknown>) || {})
                  .map(([k, v]) => `${k}: ${String(v ?? "")}`)
                  .join("<br/>")
              );
            }
          : undefined
      });
      layer.addTo(map);
      layersRef.current.push(layer);
    };

    addLayer(
      { type: "FeatureCollection", features: [data.extentBox] },
      { color: "#ffffff", weight: 1, opacity: 0.5, fillOpacity: 0 }
    );
    addLayer({ type: "FeatureCollection", features: [data.parcel] }, { color: "#dc2626", weight: 3, fillOpacity: 0 }, true);
    addLayer(data.powerBuffers, { color: "#dc2626", weight: 1, fillColor: "#ef4444", fillOpacity: 0.18 }, true);
    addLayer(data.powerLines, { color: "#f97316", weight: 2 }, true);
    addLayer(data.waterBuffers, { color: "#2563eb", weight: 1, fillColor: "#60a5fa", fillOpacity: 0.2 }, true);
    addLayer(data.waterSave, { color: "#06b6d4", weight: 1, fillColor: "#67e8f9", fillOpacity: 0.2 }, true);
    addLayer(data.ooptAreas, { color: "#a855f7", weight: 1, fillColor: "#c084fc", fillOpacity: 0.22 }, true);
    addLayer(data.landuseIntersected, { color: "#eab308", weight: 1, fillColor: "#fde047", fillOpacity: 0.22 }, true);

    const b = L.geoJSON(data.extentBox).getBounds();
    if (b.isValid()) {
      map.fitBounds(b, { padding: [24, 24], maxZoom: RISK_MAP_FIT_MAX_ZOOM });
      const cap = Math.min(RISK_MAP_FIT_MAX_ZOOM, map.getMaxZoom());
      map.setZoom(Math.min(map.getZoom() + RISK_MAP_EXTRA_ZOOM, cap));
    }
  }, [data, mapReady]);

  const riskSummary = useMemo(() => (data ? parcelRiskLabelsIntersecting(data) : []), [data]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold">Карта рисков участка</h1>
        <p className="mt-1 text-sm text-slate-300">
          Участок. Кадастровый номер: {payload?.cadastreNumber || "—"}
        </p>
        {loading ? <p className="mt-2 text-sm text-slate-300">Загружаю геослои…</p> : null}
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        {data ? (
          <p className="mt-2 text-sm text-slate-300">
            <span className="text-slate-300">Риски: </span>
            {riskSummary.length > 0 ? (
              riskSummary.map((label, i) => (
                <span key={label}>
                  {i > 0 ? <span className="text-slate-500"> · </span> : null}
                  <span className="font-medium text-red-400">{label}</span>
                </span>
              ))
            ) : (
              <span className="text-slate-400">пересечений с границами участка нет.</span>
            )}
          </p>
        ) : null}
        {payload && (terrainLoading || terrain || terrainNote) ? (
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {terrainLoading ? <p className="text-slate-400">Загружаю рельеф (NASADEM)…</p> : null}
            {terrainNote && !terrainLoading ? (
              <p
                className={
                  terrainNote.includes("не подключ")
                    ? "text-amber-200/90"
                    : "text-red-300"
                }
              >
                {terrainNote}
              </p>
            ) : null}
            {terrain && !terrainLoading ? (
              <>
                <p>
                  <span className="text-slate-400">Абсолютная высота участка: </span>
                  <span className="text-slate-100">{formatMeters(terrain.elevationM)}</span>
                </p>
                <p>
                  <span className="text-slate-400">Максимальный уклон на участке: </span>
                  <span className="text-slate-100">{formatDegrees(terrain.maxSlopeDeg)}</span>
                  {terrain.maxSlopeDeg != null && Number.isFinite(terrain.maxSlopeDeg) ? (
                    terrain.maxSlopeDeg > SLOPE_NORM_MAX_DEG ? (
                      <>
                        {" "}
                        <span className="font-medium text-red-400">
                          Критический уклон, возможно развитие оползней.
                        </span>
                      </>
                    ) : terrain.maxSlopeDeg > SLOPE_MODERATE_MIN_DEG ? (
                      <>
                        {" "}
                        <span className="font-medium text-orange-300">
                          Умеренный риск: требуется повышенное внимание при строительстве.
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500"> (в пределах нормы)</span>
                    )
                  ) : null}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
      <div className="relative mx-auto mb-6 h-[calc(100vh-150px)] max-w-7xl overflow-hidden rounded-xl border border-slate-700">
        <div ref={containerRef} className="h-full w-full" />
        <aside className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[min(22rem,calc(100%-1.5rem))]">
          <div className="pointer-events-auto rounded-lg border border-white/45 bg-black/92 px-3 py-2.5 shadow-2xl ring-2 ring-white/20 backdrop-blur-md">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white">Легенда</p>
            <ul className="mt-2 space-y-2 text-xs leading-snug text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.9)]">
              <li className="flex gap-2">
                <span
                  className="mt-0.5 h-4 w-6 shrink-0 rounded-sm border border-blue-700"
                  style={{ backgroundColor: "rgba(96, 165, 250, 0.35)" }}
                  aria-hidden
                />
                <span>Водоохранная зона</span>
              </li>
              <li className="flex gap-2">
                <span
                  className="mt-0.5 h-4 w-6 shrink-0 rounded-sm border border-red-600"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.22)" }}
                  aria-hidden
                />
                <span>Охранная зона объектов электросетевого хозяйства</span>
              </li>
              <li className="flex gap-2">
                <span
                  className="mt-0.5 h-4 w-6 shrink-0 rounded-sm border border-purple-500"
                  style={{ backgroundColor: "rgba(192, 132, 252, 0.28)" }}
                  aria-hidden
                />
                <span>ООПТ</span>
              </li>
              <li className="flex gap-2 border-t border-white/35 pt-2">
                <span className="mt-0.5 h-0.5 w-6 shrink-0 self-center rounded-full bg-orange-500" aria-hidden />
                <span>Линии ЛЭП</span>
              </li>
              <li className="flex gap-2">
                <span
                  className="mt-0.5 h-4 w-6 shrink-0 rounded-sm border border-cyan-600"
                  style={{ backgroundColor: "rgba(103, 232, 249, 0.25)" }}
                  aria-hidden
                />
                <span>Водные объекты (охрана)</span>
              </li>
              <li className="flex gap-2">
                <span
                  className="mt-0.5 h-4 w-6 shrink-0 rounded-sm border border-yellow-600"
                  style={{ backgroundColor: "rgba(253, 224, 71, 0.28)" }}
                  aria-hidden
                />
                <span>Землепользование (средний / высокий риск)</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 h-3 w-6 shrink-0 rounded-sm border-2 border-red-500 bg-transparent" aria-hidden />
                <span>Кадастровый участок</span>
              </li>
              <li className="flex gap-2 text-white">
                <span className="mt-0.5 h-3 w-6 shrink-0 rounded-sm border border-white/50 bg-transparent" aria-hidden />
                <span>Рамка экстента 8×8 км</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
