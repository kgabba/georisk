"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";

type LatLngTuple = [number, number];

export type MobileMapGeomanInnerProps = {
  onPolygonChange: (coords: LatLngTuple[], geojson: GeoJSON.Feature | null) => void;
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

export default function MobileMapGeomanInner({ onPolygonChange }: MobileMapGeomanInnerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true
    }).setView([55.75, 37.61], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

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
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
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
    };
  }, [onPolygonChange]);

  return <div ref={containerRef} className="h-[400px] w-full min-h-[400px]" />;
}
