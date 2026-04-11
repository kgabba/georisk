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

/** Ответ POST /api/cadastre/by-polygon (каждый кандидат — как lookup + поле code). */
export type CadastrePolygonCandidate = CadastreLookupResponse & { code: string };

export type CadastreByPolygonSuccessBody = {
  candidates: CadastrePolygonCandidate[];
};

/** Минимум для подсветки кандидатов на Leaflet (код + GeoJSON участка). */
export type CadastreMapCandidate = {
  code: string;
  feature: GeoJSON.Feature;
};
