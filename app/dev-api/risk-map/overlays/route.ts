import { NextResponse } from "next/server";
import { Pool } from "pg";
import { clipFeatureCollectionToExtent } from "@/lib/risk-map-clip";

export const runtime = "nodejs";

const HALF_EXTENT_M = 4000;
/** Макс. число исходных объектов на слой перед объединением (защита от тяжёлых запросов). */
const MERGE_INPUT_LIMIT = 8000;

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      host: process.env.POSTGRES_HOST ?? "db",
      port: Number(process.env.POSTGRES_PORT ?? 5432)
    });
  }
  return pool;
}

function rowsToFeatureCollection(rows: Array<{ geometry: GeoJSON.Geometry; properties?: Record<string, unknown> }>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature" as const,
      geometry: r.geometry,
      properties: r.properties ?? {}
    }))
  };
}

async function queryLayer(sql: string, geomJson: string): Promise<GeoJSON.FeatureCollection> {
  try {
    const { rows } = await getPool().query(sql, [geomJson, HALF_EXTENT_M, MERGE_INPUT_LIMIT]);
    return rowsToFeatureCollection(rows);
  } catch {
    return { type: "FeatureCollection", features: [] };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { cadastreFeature?: GeoJSON.Feature };
    if (!body?.cadastreFeature?.geometry) {
      return NextResponse.json({ message: "Отсутствует геометрия участка" }, { status: 400 });
    }

    const geomJson = JSON.stringify(body.cadastreFeature.geometry);

    const parcelSql = `
      WITH parcel AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)) AS geom
      )
      SELECT ST_AsGeoJSON(geom)::json AS geometry
      FROM parcel
    `;
    const extentSql = `
      WITH parcel AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)) AS geom
      ),
      extent AS (
        SELECT ST_Transform(ST_Expand(ST_Transform(geom, 3857), $2::int), 4326) AS geom
        FROM parcel
      )
      SELECT ST_AsGeoJSON(ST_Envelope(geom))::json AS geometry
      FROM extent
    `;
    const baseExtent = `
      WITH parcel AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)) AS geom
      ),
      extent AS (
        SELECT ST_Transform(ST_Expand(ST_Transform(geom, 3857), $2::int), 4326) AS geom
        FROM parcel
      )
    `;

    const [{ rows: parcelRows }, { rows: extentRows }] = await Promise.all([
      getPool().query(parcelSql, [geomJson]),
      getPool().query(extentSql, [geomJson, HALF_EXTENT_M])
    ]);

    const powerLinesMergedSql = `
      ${baseExtent},
      src AS (
        SELECT p.geom
        FROM power_lines p, extent e
        WHERE ST_Intersects(p.geom, e.geom)
        LIMIT $3
      ),
      merged AS (
        SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
      )
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
             jsonb_build_object('layer', 'power_lines', 'merged', true) AS properties
      FROM merged m
      WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
    `;

    const powerBuffersMergedSql = `
      ${baseExtent},
      src AS (
        SELECT p.geom
        FROM power_buffers p, extent e
        WHERE ST_Intersects(p.geom, e.geom)
        LIMIT $3
      ),
      merged AS (
        SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
      )
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
             jsonb_build_object('layer', 'power_buffers', 'merged', true) AS properties
      FROM merged m
      WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
    `;

    const waterSaveMergedSql = `
      ${baseExtent},
      src AS (
        SELECT w.geom
        FROM water_save w, extent e
        WHERE ST_Intersects(w.geom, e.geom)
        LIMIT $3
      ),
      merged AS (
        SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
      )
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
             jsonb_build_object('layer', 'water_save', 'merged', true) AS properties
      FROM merged m
      WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
    `;

    const waterBuffersMergedSql = `
      ${baseExtent},
      src AS (
        SELECT w.geom
        FROM river_lines_buffer w, extent e
        WHERE ST_Intersects(w.geom, e.geom)
        LIMIT $3
      ),
      merged AS (
        SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
      )
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
             jsonb_build_object('layer', 'river_lines_buffer', 'merged', true) AS properties
      FROM merged m
      WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
    `;

    const ooptAreasSql = `
      ${baseExtent}
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(o.geom, 0.00001))::json AS geometry,
             jsonb_build_object('id', o.id, 'name_eng', o.name_eng) AS properties
      FROM oopt_areas o, extent e
      WHERE ST_Intersects(o.geom, e.geom)
      LIMIT $3
    `;
    const landuseIntersectSql = `
      WITH parcel AS (
        SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)) AS geom
      )
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(l.geom, 0.00001))::json AS geometry,
             jsonb_build_object('raw', l.raw, 'landuse', l.landuse, 'name', l.name, 'risk', l.risk, 'region', l.region) AS properties
      FROM landuse_areas l, parcel p
      WHERE ST_Intersects(l.geom, p.geom)
        AND LOWER(COALESCE(l.risk, '')) IN ('средний', 'высокий', 'medium', 'high')
      LIMIT $3
    `;

    const [powerLines, powerBuffers, waterSave, waterBuffers, ooptAreas, landuseIntersected] = await Promise.all([
      queryLayer(powerLinesMergedSql, geomJson),
      queryLayer(powerBuffersMergedSql, geomJson),
      queryLayer(waterSaveMergedSql, geomJson),
      queryLayer(waterBuffersMergedSql, geomJson),
      queryLayer(ooptAreasSql, geomJson),
      queryLayer(landuseIntersectSql, geomJson)
    ]);

    const extentBox = {
      type: "Feature" as const,
      geometry: extentRows[0]?.geometry ?? null,
      properties: { halfExtentMeters: HALF_EXTENT_M }
    } as GeoJSON.Feature;

    const clip = (fc: GeoJSON.FeatureCollection) => clipFeatureCollectionToExtent(fc, extentBox);

    return NextResponse.json({
      parcel: {
        type: "Feature",
        geometry: parcelRows[0]?.geometry ?? body.cadastreFeature.geometry,
        properties: body.cadastreFeature.properties ?? {}
      },
      extentBox,
      powerLines: clip(powerLines),
      powerBuffers: clip(powerBuffers),
      waterSave: clip(waterSave),
      waterBuffers: clip(waterBuffers),
      ooptAreas: clip(ooptAreas),
      landuseIntersected: clip(landuseIntersected)
    });
  } catch {
    return NextResponse.json({ message: "Не удалось собрать слои рисков." }, { status: 500 });
  }
}
