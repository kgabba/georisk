"use client";

import { useEffect, useRef } from "react";
import L, { Map as LeafletMapInstance } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

interface LeafletMapProps {
  onPolygonDrawn: (coords: [number, number][]) => void;
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

export function LeafletMap({ onPolygonDrawn }: LeafletMapProps) {
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // Высота карты уменьшена примерно в 1.6 раза
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border border-emerald-100 bg-slate-100 shadow-soft sm:h-[380px]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
