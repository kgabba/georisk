"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import type { CadastreMapCandidate } from "@/lib/cadastre";

type LatLngTuple = [number, number];

export type MobileMapGeomanInnerProps = {
  onPolygonChange: (coords: LatLngTuple[], geojson: GeoJSON.Feature | null) => void;
  focusCoords?: [number, number] | null;
  selectedGeoFeature?: GeoJSON.Feature | null;
  cadastreCandidates?: CadastreMapCandidate[] | null;
  onCadastreCandidateClick?: (code: string) => void;
};

function polygonFromLayer(layer: L.Layer): { coords: LatLngTuple[]; geojson: GeoJSON.Feature } | null {
  if (layer instanceof L.Polygon) {
    const ring = layer.getLatLngs()[0] as L.LatLng[];
    if (!ring?.length) return null;
    const coords = ring.map((ll) => [ll.lat, ll.lng] as LatLngTuple);
    return {
      coords,
      geojson: layer.toGeoJSON() as GeoJSON.Feature
    };
  }
  return null;
}

function syncFromMap(map: L.Map, onPolygonChange: MobileMapGeomanInnerProps["onPolygonChange"]) {
  const layers = map.pm.getGeomanLayers();
  const poly = layers.find((l) => l instanceof L.Polygon) as L.Polygon | undefined;
  if (!poly) {
    onPolygonChange([], null);
    return;
  }
  const data = polygonFromLayer(poly);
  if (data) onPolygonChange(data.coords, data.geojson);
}

export default function MobileMapGeomanInner({
  onPolygonChange,
  focusCoords = null,
  selectedGeoFeature = null,
  cadastreCandidates = null,
  onCadastreCandidateClick
}: MobileMapGeomanInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedLayerRef = useRef<L.GeoJSON | null>(null);
  const candidatesLayerRef = useRef<L.FeatureGroup | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const [baseLayer, setBaseLayer] = useState<"osm" | "satellite">("osm");

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: false
    });

    const leningradToKurgan = L.latLngBounds(
      [54.35, 27.15] as L.LatLngTuple,
      [61.35, 66.85] as L.LatLngTuple
    );
    map.fitBounds(leningradToKurgan, { padding: [12, 12], maxZoom: 7 });

    const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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

    map.pm.setGlobalOptions({
      pathOptions: {
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.2,
        weight: 2
      }
    });

    map.pm.addControls({
      position: "topright",
      drawMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawPolygon: true,
      drawCircle: false,
      drawCircleMarker: false,
      drawText: false,
      drawFreehand: false,
      lassoMode: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
      editControls: false,
      optionsControls: false,
      oneBlock: false
    });

    const handleChange = () => syncFromMap(map, onPolygonChange);

    map.on("pm:create", (e) => {
      map.pm.getGeomanLayers().forEach((layer) => {
        if (layer !== e.layer) {
          map.removeLayer(layer);
        }
      });
      handleChange();
    });

    map.on("pm:remove", handleChange);
    map.on("pm:update", handleChange);

    mapRef.current = map;

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    requestAnimationFrame(onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      osmLayerRef.current = null;
      satelliteLayerRef.current = null;
    };
  }, [onPolygonChange]);

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
    if (!map) return;

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
    layer.addTo(map);
    selectedLayerRef.current = layer;
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 17 });
    }
  }, [selectedGeoFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
    group.addTo(map);
    candidatesLayerRef.current = group;

    try {
      const b = group.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20], maxZoom: 17 });
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
    map.pm.enableDraw("Polygon", {
      pathOptions: {
        color: "#2563eb",
        fillColor: "#2563eb",
        fillOpacity: 0.2,
        weight: 2
      }
    });
  }

  return (
    <div className="mobile-map-root relative h-[400px] w-full min-h-[400px]">
      <button
        type="button"
        onClick={() => setBaseLayer((prev) => (prev === "osm" ? "satellite" : "osm"))}
        className="absolute left-[50px] top-2 z-[700] inline-flex h-8 min-w-[72px] items-center justify-center rounded-md border border-slate-300 bg-white/95 px-2 text-[11px] font-semibold text-slate-700 shadow hover:bg-slate-50"
      >
        {baseLayer === "osm" ? "Спутник" : "OSM"}
      </button>
      <button
        type="button"
        onClick={startPolygonDraw}
        className="absolute right-[48px] top-[10px] z-[700] inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white/95 px-2 text-[11px] font-semibold text-slate-700 shadow hover:bg-slate-50"
      >
        Выделить полигон
      </button>
      <style jsx global>{`
        .mobile-map-root .button-container:has(.leaflet-pm-icon-polygon) {
          display: none !important;
        }
        .mobile-map-root .leaflet-top.leaflet-right {
          margin-top: -4px !important;
        }
      `}</style>
      <div ref={containerRef} className="h-full w-full min-h-[400px]" />
    </div>
  );
}
