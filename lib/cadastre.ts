export type CadastreSummary = {
  cadNum: string | null;
  label: string | null;
  costValue: number | null;
  areaValue: number | null;
  category: string | null;
  permittedUse: string | null;
};

export type CadastreLookupResponse = {
  feature: GeoJSON.Feature;
  summary: CadastreSummary;
  rawProperties: Record<string, unknown>;
  cacheHit: boolean;
};
