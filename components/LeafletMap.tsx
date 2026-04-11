"use client";

import { useEffect, useRef } from "react";
import L, { Map as LeafletMapInstance } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import type { CadastreMapCandidate } from "@/lib/cadastre";

interface LeafletMapProps {
  onPolygonDrawn: (coords: [number, number][]) => void;
  selectedGeoFeature?: GeoJSON.Feature | null;
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
  selectedGeoFeature = null,
  cadastreCandidates = null,
  onCadastreCandidateClick
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedLayerRef = useRef<L.GeoJSON | null>(null);
  const candidatesLayerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true
    });

    mapRef.current = map;
    map.setView([55.7558, 37.6173], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

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
    };
  }, [onPolygonDrawn]);

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
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
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
      if (b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 17 });
    } catch {
      /* ignore */
    }
  }, [cadastreCandidates, onCadastreCandidateClick]);

  // Увеличили карту пропорционально расширенным блокам
  return (
    <div className="h-[380px] w-full overflow-hidden rounded-2xl border border-emerald-100 bg-slate-100 shadow-soft sm:h-[450px]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
