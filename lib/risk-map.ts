export type RiskMapFeatureCollection = GeoJSON.FeatureCollection;

export type RiskMapOverlaysResponse = {
  parcel: GeoJSON.Feature;
  extentBox: GeoJSON.Feature;
  powerLines: RiskMapFeatureCollection;
  powerBuffers: RiskMapFeatureCollection;
  waterSave: RiskMapFeatureCollection;
  waterBuffers: RiskMapFeatureCollection;
  ooptAreas: RiskMapFeatureCollection;
  landuseIntersected: RiskMapFeatureCollection;
};
