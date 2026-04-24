"use client";

import { useEffect, useRef, useState } from "react";
import L, { Map as LeafletMapInstance } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import type { CadastreMapCandidate } from "@/lib/cadastre";

interface LeafletMapProps {
  onPolygonDrawn: (coords: [number, number][]) => void;
  selectedGeoFeature?: GeoJSON.Feature | null;
  focusCoords?: [number, number] | null;
  /** Несколько ЗУ после поиска по полигону — клик по контуру выбирает участок. */
  cadastreCandidates?: CadastreMapCandidate[] | null;
  onCadastreCandidateClick?: (code: string) => void;
}

type DrawControlConstructor = new (options: {
  position: "topright" | "topleft" | "bottomright" | "bottomleft";
  draw: {
    polygon: {
      allowIntersection: boolean;
      showArea: boolean;
      shapeOptions: {
        color: string;
        weight: number;
      };
    };
    polyline: false;
    rectangle: false;
    circle: false;
    circlemarker: false;
    marker: false;
  };
  edit: {
    featureGroup: L.FeatureGroup;
  };
}) => L.Control;

type CreatedEvent = L.LeafletEvent & { layer: L.Layer };
type EditedEvent = L.LeafletEvent & { layers: L.LayerGroup };

export function LeafletMap({
  onPolygonDrawn,
  focusCoords = null,
  selectedGeoFeature = null,
  cadastreCandidates = null,
  onCadastreCandidateClick
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedLayerRef = useRef<L.GeoJSON | null>(null);
  const candidatesLayerRef = useRef<L.FeatureGroup | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const [baseLayer, setBaseLayer] = useState<"osm" | "satellite">("osm");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const drawLocal = (L as unknown as { drawLocal?: Record<string, unknown> }).drawLocal;
    if (drawLocal && typeof drawLocal === "object") {
      const draw = (drawLocal.draw ?? {}) as Record<string, unknown>;
      const toolbar = (draw.toolbar ?? {}) as Record<string, unknown>;
      const buttons = (toolbar.buttons ?? {}) as Record<string, unknown>;
      buttons.polygon = "Выделить участок";
      toolbar.buttons = buttons;
      draw.toolbar = toolbar;
      drawLocal.draw = draw;
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false
    });

    mapRef.current = map;
    map.setView([55.7558, 37.6173], 5);
    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri"
      }
    );
    osmLayer.addTo(map);
    osmLayerRef.current = osmLayer;
    satelliteLayerRef.current = satelliteLayer;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const DrawControl = (L.Control as unknown as { Draw: DrawControlConstructor }).Draw;

    const drawControl = new DrawControl({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: "#2563eb",
            weight: 2
          }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false
      },
      edit: {
        featureGroup: drawnItems
      }
    });

    map.addControl(drawControl);

    map.on("draw:created", (event: L.LeafletEvent) => {
      const createdEvent = event as CreatedEvent;
      drawnItems.clearLayers();
      const layer = createdEvent.layer;
      drawnItems.addLayer(layer);

      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        onPolygonDrawn(latlngs.map((ll) => [ll.lat, ll.lng]));
      }
    });

    map.on("draw:edited", (event: L.LeafletEvent) => {
      const editedEvent = event as EditedEvent;
      editedEvent.layers.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          onPolygonDrawn(latlngs.map((ll) => [ll.lat, ll.lng]));
        }
      });
    });

    map.on("draw:deleted", () => onPolygonDrawn([]));

    return () => {
      map.remove();
      mapRef.current = null;
      selectedLayerRef.current = null;
      candidatesLayerRef.current = null;
      osmLayerRef.current = null;
      satelliteLayerRef.current = null;
    };
  }, [onPolygonDrawn]);

  useEffect(() => {
    const map = mapRef.current;
    const osm = osmLayerRef.current;
    const satellite = satelliteLayerRef.current;
    if (!map || !osm || !satellite) return;
    if (baseLayer === "satellite") {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(satellite)) satellite.addTo(map);
    } else {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [baseLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as L.Map & { _loaded?: boolean })._loaded) return;

    if (selectedLayerRef.current) {
      map.removeLayer(selectedLayerRef.current);
      selectedLayerRef.current = null;
    }

    if (!selectedGeoFeature) return;

    const layer = L.geoJSON(selectedGeoFeature, {
      style: {
        color: "#0f766e",
        weight: 3,
        fillColor: "#14b8a6",
        fillOpacity: 0.2
      }
    });
    try {
      layer.addTo(map);
    } catch {
      return;
    }
    selectedLayerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    }
  }, [selectedGeoFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as L.Map & { _loaded?: boolean })._loaded) return;

    if (candidatesLayerRef.current) {
      map.removeLayer(candidatesLayerRef.current);
      candidatesLayerRef.current = null;
    }

    if (!cadastreCandidates?.length) return;

    const group = L.featureGroup();
    for (const c of cadastreCandidates) {
      const gj = L.geoJSON(c.feature, {
        style: {
          color: "#b45309",
          weight: 2,
          fillColor: "#fbbf24",
          fillOpacity: 0.38
        },
        onEachFeature: (_f, layer) => {
          layer.on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            onCadastreCandidateClick?.(c.code);
          });
        }
      });
      gj.addTo(group);
    }
    try {
      group.addTo(map);
    } catch {
      return;
    }
    candidatesLayerRef.current = group;

    try {
      const b = group.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 17 });
    } catch {
      /* ignore */
    }
  }, [cadastreCandidates, onCadastreCandidateClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusCoords) return;
    map.setView([focusCoords[0], focusCoords[1]], 12);
  }, [focusCoords]);

  function startPolygonDraw() {
    const map = mapRef.current;
    if (!map) return;
    const DrawCtor = (L as unknown as { Draw?: { Polygon?: new (m: L.Map, opts: Record<string, unknown>) => { enable: () => void } } })
      .Draw?.Polygon;
    if (!DrawCtor) return;
    const drawer = new DrawCtor(map, {
      allowIntersection: false,
      showArea: true,
      shapeOptions: { color: "#2563eb", weight: 2 }
    });
    drawer.enable();
  }

  // Увеличили карту пропорционально расширенным блокам
  return (
    <div className="desktop-map-root relative h-[380px] w-full overflow-hidden rounded-2xl border border-emerald-100 bg-slate-100 shadow-soft sm:h-[450px]">
      <button
        type="button"
        onClick={() => setBaseLayer((prev) => (prev === "osm" ? "satellite" : "osm"))}
        className="absolute left-[52px] top-3 z-[700] inline-flex h-8 min-w-[78px] items-center justify-center rounded-md border border-slate-300 bg-white/95 px-2 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50"
      >
        {baseLayer === "osm" ? "Спутник" : "OSM"}
      </button>
      <button
        type="button"
        onClick={startPolygonDraw}
        className="absolute right-[54px] top-[10px] z-[700] inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white/95 px-2.5 text-xs font-semibold text-slate-700 shadow hover:bg-slate-50"
      >
        Выделить полигон
      </button>
      <style jsx global>{`
        .desktop-map-root .leaflet-draw .leaflet-draw-section:first-child {
          display: none !important;
        }
        .desktop-map-root .leaflet-top.leaflet-right {
          margin-top: -4px !important;
        }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
