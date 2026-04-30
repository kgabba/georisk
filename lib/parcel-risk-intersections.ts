import type { FeatureCollection } from "geojson";
import { geojsonIntersectsParcel } from "@/lib/geojson-parcel-intersects";
import type { RiskMapOverlaysResponse } from "@/lib/risk-map";

/** Есть ли хотя бы один объект коллекции, пересекающий полигон участка (не только экстент). */
export function featureCollectionIntersectsParcel(
  parcel: GeoJSON.Feature | undefined,
  fc: FeatureCollection | undefined
): boolean {
  if (!parcel?.geometry || !fc?.features?.length) return false;
  for (const f of fc.features) {
    if (!f?.geometry) continue;
    if (geojsonIntersectsParcel(parcel, f)) return true;
  }
  return false;
}

/** Подписи рисков только при пересечении геометрии слоя с участком. */
export function parcelRiskLabelsIntersecting(data: RiskMapOverlaysResponse): string[] {
  const parcel = data.parcel;
  const items: string[] = [];

  // Риск ЛЭП считаем только по охранной (буферной) зоне, а не по линии как таковой.
  if (featureCollectionIntersectsParcel(parcel, data.powerBuffers)) {
    items.push("Охранная зона объектов электросетевого хозяйства");
  }
  if (featureCollectionIntersectsParcel(parcel, data.waterBuffers)) {
    items.push("Водоохранная зона");
  }
  if (featureCollectionIntersectsParcel(parcel, data.waterSave)) {
    items.push("Водные объекты (охрана)");
  }
  if (featureCollectionIntersectsParcel(parcel, data.ooptAreas)) {
    items.push("ООПТ");
  }
  if (featureCollectionIntersectsParcel(parcel, data.landuseIntersected)) {
    items.push("Землепользование (средний / высокий риск)");
  }

  return items;
}
