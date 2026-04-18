"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L, { type Map as LeafletMapInstance } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RiskMapOverlaysResponse } from "@/lib/risk-map";

type StoredPayload = {
  cadastreFeature: GeoJSON.Feature;
  cadastreNumber: string | null;
};

const STORAGE_KEY = "georisk:risk-map-payload";

function collectionSize(fc: GeoJSON.FeatureCollection | undefined): number {
  return fc?.features?.length ?? 0;
}

export default function RiskMapPage() {
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  const [payload, setPayload] = useState<StoredPayload | null>(null);
  const [data, setData] = useState<RiskMapOverlaysResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    mapRef.current = map;
    map.setView([55.75, 37.62], 14);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles &copy; Esri"
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
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
    fetch("/dev-api/risk-map/overlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cadastreFeature: payload.cadastreFeature })
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.message || "Не удалось получить слои рисков.");
        }
        setData(body as RiskMapOverlaysResponse);
      })
      .catch((e: unknown) => setError(String((e as Error)?.message || e)))
      .finally(() => setLoading(false));
  }, [payload]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    for (const old of layersRef.current) {
      map.removeLayer(old);
    }
    layersRef.current = [];

    const addLayer = (
      fc: GeoJSON.FeatureCollection,
      style: L.PathOptions,
      withPopup = false
    ) => {
      const layer = L.geoJSON(fc, {
        style: () => style,
        onEachFeature: withPopup
          ? (_f, l) => {
              l.bindPopup(
                Object.entries((_f.properties as Record<string, unknown>) || {})
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
      map.fitBounds(b, { padding: [24, 24], maxZoom: 18 });
    }
  }, [data]);

  const stats = useMemo(() => {
    if (!data) return null;
    return [
      `ЛЭП (линии, объедин.): ${collectionSize(data.powerLines)}`,
      `Буферы ЛЭП (объедин.): ${collectionSize(data.powerBuffers)}`,
      `water_save (объедин.): ${collectionSize(data.waterSave)}`,
      `Буферы рек (объедин.): ${collectionSize(data.waterBuffers)}`,
      `ООПТ: ${collectionSize(data.ooptAreas)}`,
      `Землепользование (пересечения): ${collectionSize(data.landuseIntersected)}`
    ];
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100">
      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold">Карта рисков участка</h1>
        <p className="mt-1 text-sm text-slate-300">
          Участок: {payload?.cadastreNumber || "без номера"}; масштаб сразу на экстент 8x8 км вокруг участка, landuse только высокий/средний риск и только при пересечении с участком.
        </p>
        {loading ? <p className="mt-2 text-sm text-slate-300">Загружаю геослои…</p> : null}
        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        {stats ? <p className="mt-2 text-xs text-slate-300">{stats.join(" | ")}</p> : null}
      </section>
      <div className="mx-auto mb-6 h-[calc(100vh-150px)] max-w-7xl overflow-hidden rounded-xl border border-slate-700">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </main>
  );
}
