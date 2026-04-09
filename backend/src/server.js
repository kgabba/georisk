import Fastify from "fastify";
import { Pool } from "pg";
import { z } from "zod";

const PORT = Number(process.env.API_PORT ?? 3001);
const HOST = process.env.API_HOST ?? "0.0.0.0";

const requiredVars = ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_HOST", "POSTGRES_PORT"];
for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

const pool = new Pool({
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT)
});

const fastify = Fastify({ logger: true });

const leadSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(10).max(40),
  polygonCoords: z.array(z.tuple([z.number(), z.number()])).nullable().optional(),
  cadastreNumber: z.string().max(64).nullable().optional(),
  cadastreFeature: z.any().nullable().optional()
});

const cadastreCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[0-9:\-./]+$/i, "Invalid cadastral code format");

function toWgs84Coord([x, y]) {
  const lon = (x / 6378137.0) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / 6378137.0)) - Math.PI / 2) * (180 / Math.PI);
  return [lon, lat];
}

function normalizeCoordsToWgs84(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) => ring.map(toWgs84Coord))
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((poly) => poly.map((ring) => ring.map(toWgs84Coord)))
    };
  }
  return geometry;
}

function toSummary(properties = {}) {
  const options = properties.options ?? {};
  return {
    cadNum: options.cad_num ?? properties.label ?? null,
    label: properties.label ?? null,
    costValue: Number.isFinite(Number(options.cost_value)) ? Number(options.cost_value) : null,
    areaValue: Number.isFinite(Number(options.area_value)) ? Number(options.area_value) : null,
    category: typeof options.category === "string" ? options.category : null,
    permittedUse: typeof options.permitted_use === "string" ? options.permitted_use : null
  };
}

async function fetchCadastreFeature(code) {
  const url = new URL("https://nspd.gov.ru/api/geoportal/v2/search/geoportal");
  url.searchParams.set("thematicSearchId", "1");
  url.searchParams.set("query", code);
  url.searchParams.set("CRS", "EPSG:4326");

  const response = await fetch(url.toString(), { headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error(`NSPD request failed with status ${response.status}`);

  const payload = await response.json();
  const feature = payload?.data?.features?.[0];
  if (!feature) return null;

  const geometry = normalizeCoordsToWgs84(feature.geometry);
  return { ...feature, geometry };
}

function toPolygonWkt(coords) {
  if (!coords || coords.length < 3) return null;
  const ring = [...coords];
  const [firstLat, firstLng] = ring[0];
  const [lastLat, lastLng] = ring[ring.length - 1];
  if (firstLat !== lastLat || firstLng !== lastLng) {
    ring.push(ring[0]);
  }
  const points = ring.map(([lat, lng]) => `${lng} ${lat}`).join(", ");
  return `POLYGON((${points}))`;
}

async function ensureSchema() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS postgis");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lead_submissions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      cadastre_number TEXT NULL,
      cadastre_feature_json JSONB NULL,
      polygon_wkt TEXT NULL,
      polygon_geom geometry(Polygon, 4326) NULL,
      source TEXT NOT NULL DEFAULT 'landing',
      client_ip TEXT NULL,
      user_agent TEXT NULL,
      metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_lead_submissions_created_at ON lead_submissions (created_at DESC)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_lead_submissions_cadastre_number ON lead_submissions (cadastre_number)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_lead_submissions_polygon_geom_gist ON lead_submissions USING GIST (polygon_geom)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cadastre_cache (
      code TEXT PRIMARY KEY,
      feature_json JSONB NOT NULL,
      summary_json JSONB NOT NULL,
      raw_properties_json JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_cadastre_cache_expires_at ON cadastre_cache (expires_at)");
}

fastify.get("/health", async () => ({ ok: true }));

fastify.get("/api/cadastre/:code", async (request, reply) => {
  const parsedCode = cadastreCodeSchema.safeParse(request.params?.code);
  if (!parsedCode.success) return reply.status(400).send({ message: "Invalid cadastral code" });
  const code = parsedCode.data;

  const cached = await pool.query(
    `
      SELECT feature_json, summary_json, raw_properties_json
      FROM cadastre_cache
      WHERE code = $1 AND expires_at > NOW()
    `,
    [code]
  );
  if (cached.rows.length) {
    return reply.status(200).send({
      feature: cached.rows[0].feature_json,
      summary: cached.rows[0].summary_json,
      rawProperties: cached.rows[0].raw_properties_json,
      cacheHit: true
    });
  }

  const feature = await fetchCadastreFeature(code);
  if (!feature) return reply.status(404).send({ message: "Cadastre not found" });

  const rawProperties = feature.properties ?? {};
  const summary = toSummary(rawProperties);
  await pool.query(
    `
      INSERT INTO cadastre_cache (code, feature_json, summary_json, raw_properties_json, expires_at)
      VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, NOW() + INTERVAL '24 hours')
      ON CONFLICT (code)
      DO UPDATE SET
        feature_json = EXCLUDED.feature_json,
        summary_json = EXCLUDED.summary_json,
        raw_properties_json = EXCLUDED.raw_properties_json,
        expires_at = EXCLUDED.expires_at
    `,
    [code, JSON.stringify(feature), JSON.stringify(summary), JSON.stringify(rawProperties)]
  );

  return reply.status(200).send({
    feature,
    summary,
    rawProperties,
    cacheHit: false
  });
});

fastify.post("/api/leads", async (request, reply) => {
  const parsed = leadSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Validation failed",
      issues: parsed.error.flatten()
    });
  }

  const { name, phone, polygonCoords, cadastreNumber, cadastreFeature } = parsed.data;
  const polygonWkt = toPolygonWkt(polygonCoords);
  const clientIp = request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ?? request.ip;
  const userAgent = request.headers["user-agent"]?.toString() ?? null;

  const result = await pool.query(
    `
      INSERT INTO lead_submissions (
        name,
        phone,
        cadastre_number,
        cadastre_feature_json,
        polygon_wkt,
        polygon_geom,
        client_ip,
        user_agent
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::jsonb,
        $5,
        CASE WHEN $5 IS NOT NULL THEN ST_GeomFromText($5, 4326) ELSE NULL END,
        $6,
        $7
      )
      RETURNING id, created_at
    `,
    [name, phone, cadastreNumber ?? null, JSON.stringify(cadastreFeature ?? null), polygonWkt, clientIp, userAgent]
  );

  return reply.status(201).send({
    id: result.rows[0].id,
    createdAt: result.rows[0].created_at
  });
});

async function start() {
  await ensureSchema();
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`API server started on ${HOST}:${PORT}`);
}

async function shutdown() {
  await fastify.close();
  await pool.end();
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
