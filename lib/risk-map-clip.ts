import bbox from "@turf/bbox";
import bboxClip from "@turf/bbox-clip";
import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon } from "geojson";

type ClipGeometry = LineString | MultiLineString | Polygon | MultiPolygon;

function isGeometryEmpty(geom: GeoJSON.Geometry): boolean {
  switch (geom.type) {
    case "Point":
      return !geom.coordinates || geom.coordinates.length < 2;
    case "MultiPoint":
      return !geom.coordinates?.length;
    case "LineString":
      return !geom.coordinates || geom.coordinates.length < 2;
    case "MultiLineString":
      return !geom.coordinates?.some((line) => line.length >= 2);
    case "Polygon":
      return !geom.coordinates?.[0] || geom.coordinates[0].length < 4;
    case "MultiPolygon":
      return !geom.coordinates?.some((ring) => ring[0]?.length >= 4);
    case "GeometryCollection":
      return !geom.geometries?.length || geom.geometries.every(isGeometryEmpty);
    default:
      return true;
  }
}

/** Обрезка геометрий по прямоугольнику экстента (bbox из полигона extent), без PostGIS. */
export function clipFeatureCollectionToExtent(
  fc: GeoJSON.FeatureCollection,
  extentFeature: GeoJSON.Feature | null | undefined
): GeoJSON.FeatureCollection {
  if (!fc?.features?.length) return fc;
  if (!extentFeature?.geometry) return fc;
  const gt = extentFeature.geometry.type;
  if (gt !== "Polygon" && gt !== "MultiPolygon") return fc;

  let extentBbox: [number, number, number, number];
  try {
    const b = bbox(extentFeature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
    if (!b || b.some((x) => !Number.isFinite(x))) return fc;
    extentBbox = [b[0], b[1], b[2], b[3]];
  } catch {
    return fc;
  }

  const features: GeoJSON.Feature[] = [];
  for (const f of fc.features) {
    if (!f.geometry) continue;
    try {
      const clipped = bboxClip(f as Feature<ClipGeometry>, extentBbox);
      if (clipped?.geometry && !isGeometryEmpty(clipped.geometry)) {
        features.push({
          type: "Feature",
          properties: f.properties ?? {},
          geometry: clipped.geometry as GeoJSON.Geometry
        });
      }
    } catch {
      features.push(f);
    }
  }
  return { type: "FeatureCollection", features };
}
