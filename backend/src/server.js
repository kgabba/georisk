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
  polygonCoords: z.array(z.tuple([z.number(), z.number()])).nullable().optional()
});

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
    "CREATE INDEX IF NOT EXISTS idx_lead_submissions_polygon_geom_gist ON lead_submissions USING GIST (polygon_geom)"
  );
}

fastify.get("/health", async () => ({ ok: true }));

fastify.post("/api/leads", async (request, reply) => {
  const parsed = leadSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Validation failed",
      issues: parsed.error.flatten()
    });
  }

  const { name, phone, polygonCoords } = parsed.data;
  const polygonWkt = toPolygonWkt(polygonCoords);
  const clientIp = request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ?? request.ip;
  const userAgent = request.headers["user-agent"]?.toString() ?? null;

  const result = await pool.query(
    `
      INSERT INTO lead_submissions (
        name,
        phone,
        polygon_wkt,
        polygon_geom,
        client_ip,
        user_agent
      )
      VALUES (
        $1,
        $2,
        $3,
        CASE WHEN $3 IS NOT NULL THEN ST_GeomFromText($3, 4326) ELSE NULL END,
        $4,
        $5
      )
      RETURNING id, created_at
    `,
    [name, phone, polygonWkt, clientIp, userAgent]
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
