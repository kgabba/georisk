"use client";

import { useEffect, useRef } from "react";
import L, { Map as LeafletMapInstance } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

interface LeafletMapProps {
  onPolygonDrawn: (coords: [number, number][]) => void;
}

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

    const drawControl = new (L.Control as any).Draw({
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

    map.addControl(drawControl as any);

    map.on(L.Draw.Event.CREATED as any, (event: any) => {
      drawnItems.clearLayers();
      const layer = event.layer;
      drawnItems.addLayer(layer);

      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        onPolygonDrawn(latlngs.map((ll) => [ll.lat, ll.lng]));
      }
    });

    map.on(L.Draw.Event.EDITED as any, (event: any) => {
      event.layers.eachLayer((layer: any) => {
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          onPolygonDrawn(latlngs.map((ll) => [ll.lat, ll.lng]));
        }
      });
    });

    map.on(L.Draw.Event.DELETED as any, () => onPolygonDrawn([]));

    return () => {
      map.remove();
    };
  }, [onPolygonDrawn]);

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border border-emerald-100 bg-slate-100 shadow-soft sm:h-[380px]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
