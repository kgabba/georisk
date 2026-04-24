import https from "node:https";
import { spawn } from "node:child_process";
import { randomUUID, randomBytes, createHash, createHmac } from "node:crypto";
import { access } from "node:fs/promises";
import { constants as fsConstants, createReadStream } from "node:fs";
import Fastify from "fastify";
import { HttpsProxyAgent } from "https-proxy-agent";
import { dirname, join } from "node:path";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { clipFeatureCollectionToExtent } from "./risk-map-clip.js";
import { geeTerrainConfigured, runNasademTerrainStats } from "./nasademTerrain.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function nspdTlsInsecure() {
  const v = (process.env.NSPD_TLS_INSECURE || "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** HTTP(S) proxy URL for NSPD only, e.g. http://user:pass@second-vps:3128 */
function nspdProxyUrl() {
  return (process.env.NSPD_HTTPS_PROXY || process.env.NSPD_HTTP_PROXY || "").trim();
}

let nspdAgentCache = { key: "", agent: null };

function getNspdHttpsAgent() {
  const proxy = nspdProxyUrl();
  if (!proxy) return undefined;
  const insecure = nspdTlsInsecure();
  const key = `${proxy}\0${insecure}`;
  if (nspdAgentCache.key !== key) {
    nspdAgentCache = {
      key,
      agent: new HttpsProxyAgent(proxy, { rejectUnauthorized: !insecure })
    };
  }
  return nspdAgentCache.agent;
}

/** Заголовки как у клиента карты НСПД (см. nspd-request / браузер) — без них часто 403 с датацентров. */
const NSPD_GEOSEARCH_HEADERS = {
  Accept: "*/*",
  "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer:
    "https://nspd.gov.ru/map?thematic=PKK&zoom=20&coordinate_x=4187280.1010340527&coordinate_y=7507815.775997361&theme_id=1&is_copy_url=true&active_layers=%E8%B3%91%2C%E8%B3%90"
};

const NSPD_WMS_ZU_HEADERS = {
  ...NSPD_GEOSEARCH_HEADERS,
  Referer:
    "https://nspd.gov.ru/map?thematic=PKK&zoom=17.690976575074885&coordinate_x=4191326.8832895053&coordinate_y=7501296.123874589&theme_id=1&baseLayerId=235&is_copy_url=true&active_layers=36048"
};

const ZU_WMS_LAYER_ID = "36048";
const MAX_POLYGON_AREA_M2 = 200 * 100;
const MAX_POLYGON_VERTICES = 200;
const MAX_POLYGON_CANDIDATES = 25;
const POLYGON_SEARCH_RATE_PER_MIN = 20;

const polygonSearchHits = new Map();

function assertPolygonSearchRate(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const list = polygonSearchHits.get(ip) ?? [];
  const fresh = list.filter((t) => now - t < windowMs);
  if (fresh.length >= POLYGON_SEARCH_RATE_PER_MIN) {
    const err = new Error("POLYGON_SEARCH_RATE");
    err.status = 429;
    throw err;
  }
  fresh.push(now);
  polygonSearchHits.set(ip, fresh);
}

function lonLatTo3857(lat, lon) {
  const x = (lon * 20037508.34) / 180;
  let y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return [x, y];
}

function ringToBbox3857String(ring) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [lat, lon] of ring) {
    const [x, y] = lonLatTo3857(lat, lon);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const dx = Math.max(maxX - minX, 1);
  const dy = Math.max(maxY - minY, 1);
  const pad = Math.max(dx, dy) * 0.02 + 2;
  return `${minX - pad},${minY - pad},${maxX + pad},${maxY + pad}`;
}

function centroid3857(ring) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const [lat, lon] of ring) {
    const [x, y] = lonLatTo3857(lat, lon);
    sx += x;
    sy += y;
    n += 1;
  }
  return [sx / n, sy / n];
}

function bboxAroundPoint3857(cx, cy, halfSizeM) {
  return `${cx - halfSizeM},${cy - halfSizeM},${cx + halfSizeM},${cy + halfSizeM}`;
}

async function fetchWmsZuGetFeatureInfo(bbox3857) {
  const params = new URLSearchParams({
    REQUEST: "GetFeatureInfo",
    QUERY_LAYERS: ZU_WMS_LAYER_ID,
    SERVICE: "WMS",
    VERSION: "1.3.0",
    FORMAT: "image/png",
    STYLES: "",
    TRANSPARENT: "true",
    LAYERS: ZU_WMS_LAYER_ID,
    RANDOM: String(Math.random()),
    INFO_FORMAT: "application/json",
    FEATURE_COUNT: "50",
    /* WMS 1.3: i/j — индексы пикселя 0..WIDTH-1; для 512 центр = 255 */
    I: "255",
    J: "255",
    WIDTH: "512",
    HEIGHT: "512",
    CRS: "EPSG:3857",
    BBOX: bbox3857
  });
  const url = `https://nspd.gov.ru/api/aeggis/v3/${ZU_WMS_LAYER_ID}/wms?${params.toString()}`;
  return httpsGetJson(url, NSPD_WMS_ZU_HEADERS);
}

/** НСПД часто отдаёт FeatureCollection внутри `data`, а не на верхнем уровне. */
function wmsFeaturesFromPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.features)) return payload.features;
  const d = payload.data;
  if (d && typeof d === "object" && Array.isArray(d.features)) return d.features;
  return [];
}

function cadNumFromFeatureProps(props) {
  if (!props || typeof props !== "object") return "";
  const opt = props.options ?? {};
  const cad = typeof opt.cad_num === "string" ? opt.cad_num.trim() : "";
  const label = typeof props.label === "string" ? props.label.trim() : "";
  const descr = typeof props.descr === "string" ? props.descr.trim() : "";
  const ext = typeof props.externalKey === "string" ? props.externalKey.trim() : "";
  return cad || label || descr || ext;
}

function cadNumsFromWmsPayload(payload) {
  const feats = wmsFeaturesFromPayload(payload);
  const set = new Set();
  for (const f of feats) {
    const key = cadNumFromFeatureProps(f?.properties);
    if (key) set.add(key);
  }
  return [...set];
}

/** Геометрия из кэша уже в WGS84; из поиска — часто в EPSG:3857. Не применять Mercator→WGS84 дважды. */
function geometryAppearsWebMercator(geometry) {
  if (!geometry || typeof geometry !== "object") return false;
  let ring = null;
  if (geometry.type === "Polygon" && geometry.coordinates?.[0]?.length) {
    ring = geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon" && geometry.coordinates?.[0]?.[0]?.length) {
    ring = geometry.coordinates[0][0];
  }
  if (!ring) return false;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const x = Number(pt[0]);
    const y = Number(pt[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (Math.abs(x) > 180 || Math.abs(y) > 90) return true;
  }
  return false;
}

async function geomIntersectsUserPoly(userWkt, feature) {
  if (!feature?.geometry) return true;
  const raw = JSON.parse(JSON.stringify(feature.geometry));
  const geom = geometryAppearsWebMercator(raw) ? normalizeCoordsToWgs84(raw) : raw;
  try {
    const { rows } = await pool.query(
      `SELECT ST_Intersects(
        ST_MakeValid(ST_GeomFromText($1::text, 4326)),
        ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($2::text), 4326))
      ) AS ok`,
      [userWkt, JSON.stringify(geom)]
    );
    return rows[0]?.ok === true;
  } catch {
    return false;
  }
}

async function persistCadastreCache(code, feature, summary, rawProperties) {
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
}

async function lookupCadastreForPolygonSearch(code) {
  const cached = await pool.query(
    `
      SELECT feature_json, summary_json, raw_properties_json
      FROM cadastre_cache
      WHERE code = $1 AND expires_at > NOW()
    `,
    [code]
  );
  if (cached.rows.length) {
    return {
      feature: cached.rows[0].feature_json,
      summary: cached.rows[0].summary_json,
      rawProperties: cached.rows[0].raw_properties_json,
      cacheHit: true
    };
  }
  const feature = await fetchCadastreFeature(code);
  if (!feature) return null;
  const rawProperties = feature.properties ?? {};
  const summary = toSummary(rawProperties);
  await persistCadastreCache(code, feature, summary, rawProperties);
  return { feature, summary, rawProperties, cacheHit: false };
}

function toPolygonGeoJsonForInsert(ring) {
  if (!ring || ring.length < 3) return null;
  const r = ring.map(([lat, lng]) => [lng, lat]);
  const [a, b] = [r[0], r[r.length - 1]];
  if (a[0] !== b[0] || a[1] !== b[1]) r.push([...a]);
  return JSON.stringify({ type: "Polygon", coordinates: [r] });
}

/** GET JSON over HTTPS (Node tls); optional insecure TLS for NSPD behind TLS-inspecting proxies. */
function httpsGetJson(urlString, headers = null) {
  const url = new URL(urlString);
  const insecure = nspdTlsInsecure();
  const proxyAgent = getNspdHttpsAgent();
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: `${url.pathname}${url.search}`,
    method: "GET",
    headers:
      headers ?? {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
    rejectUnauthorized: !insecure,
    ...(proxyAgent ? { agent: proxyAgent } : {})
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        let data = null;
        if (body) {
          try {
            data = JSON.parse(body);
          } catch {
            /* WAF/HTML error page */
          }
        }
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          data
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

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

const polygonRingSchema = z.object({
  ring: z.array(z.tuple([z.number(), z.number()])).min(3).max(MAX_POLYGON_VERTICES)
});

const riskMapRequestSchema = z.object({
  cadastreFeature: z.object({
    type: z.literal("Feature"),
    geometry: z.any(),
    properties: z.record(z.any()).nullable().optional()
  })
});

/** Либо GeoJSON Feature (как у risk-map), либо ring в порядке карты [широта, долгота]. */
const terrainRequestSchema = z
  .object({
    cadastreFeature: riskMapRequestSchema.shape.cadastreFeature.optional(),
    ring: z.array(z.tuple([z.number(), z.number()])).min(3).max(500).optional()
  })
  .refine((d) => Boolean(d.cadastreFeature || d.ring), { message: "Укажите cadastreFeature или ring" });

const reportBuildSchema = z.object({
  cadastreFeature: riskMapRequestSchema.shape.cadastreFeature,
  cadastreNumber: z.string().trim().min(1).max(128).nullable().optional(),
  riskSummary: z.array(z.string()).max(20).optional(),
  mapOverlays: z.any().optional(),
  terrain: z
    .object({
      maxSlopeDeg: z.number().nullable().optional(),
      elevationM: z.number().nullable().optional()
    })
    .nullable()
    .optional()
});

const reportStatusParamsSchema = z.object({
  jobId: z.string().uuid()
});

const paymentCreateSchema = z.object({
  cadastreFeature: riskMapRequestSchema.shape.cadastreFeature,
  cadastreNumber: z.string().trim().min(1).max(128).nullable().optional(),
  tariffCode: z.enum(["single_280"])
});

const accessStatusSchema = z.object({
  cadastreFeature: riskMapRequestSchema.shape.cadastreFeature,
  cadastreNumber: z.string().trim().min(1).max(128).nullable().optional()
});

const activateCodeSchema = z.object({
  code: z.string().trim().min(4).max(128),
  cadastreFeature: riskMapRequestSchema.shape.cadastreFeature.optional(),
  cadastreNumber: z.string().trim().min(1).max(128).nullable().optional()
});

const createInviteSchema = z.object({
  cadastreFeature: riskMapRequestSchema.shape.cadastreFeature.optional(),
  cadastreNumber: z.string().trim().min(1).max(128).nullable().optional(),
  ttlHours: z.number().int().min(1).max(24 * 365).optional(),
  usesLimit: z.number().int().min(1).max(1000).optional()
});

const RISK_MAP_HALF_EXTENT_METERS = 4000;
const RISK_MAP_LAYER_LIMIT = 8000;
const REPORT_OUTPUT_DIR = process.env.REPORT_OUTPUT_DIR?.trim() || "/app/report-output";
const REPORT_PIPELINE_VERSION = "2026-04-22-satmap-v5";
const REPORT_DISABLE_CACHE = (process.env.REPORT_DISABLE_CACHE ?? "").trim().toLowerCase() === "true";
const ROBOKASSA_MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN ?? "").trim();
const ROBOKASSA_PASS1 = (process.env.ROBOKASSA_PASS1 ?? "").trim();
const ROBOKASSA_PASS2 = (process.env.ROBOKASSA_PASS2 ?? "").trim();
const ROBOKASSA_TEST_MODE = (process.env.ROBOKASSA_TEST_MODE ?? "").trim().toLowerCase() === "true";
const ACCESS_GRANT_DAYS = Number(process.env.ACCESS_GRANT_DAYS ?? 30);
const ACCESS_ADMIN_SECRET = (process.env.ACCESS_ADMIN_SECRET ?? "").trim();
const ACCESS_MASTER_CODE = (process.env.ACCESS_MASTER_CODE ?? "").trim();
const GUEST_COOKIE = "guest_sid";
const GUEST_SESSION_TTL_HOURS = Number(process.env.GUEST_SESSION_TTL_HOURS ?? 10);
const SESSION_SECRET = (process.env.SESSION_SECRET ?? process.env.POSTGRES_PASSWORD ?? "").trim();

function toWgs84Coord([x, y]) {
  const lon = (x / 6378137.0) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / 6378137.0)) - Math.PI / 2) * (180 / Math.PI);
  return [lon, lat];
}

/** Внешнее кольцо участка в WGS84 как [[lon, lat], ...] для Earth Engine. */
function exteriorRingLonLatFromCadastreGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon" && geometry.coordinates?.[0]?.length >= 3) {
    return geometry.coordinates[0].map(([lon, lat]) => [Number(lon), Number(lat)]);
  }
  if (geometry.type === "MultiPolygon" && geometry.coordinates?.[0]?.[0]?.length >= 3) {
    return geometry.coordinates[0][0].map(([lon, lat]) => [Number(lon), Number(lat)]);
  }
  return null;
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

function reportScriptPath() {
  return process.env.REPORT_PY_SCRIPT?.trim() || join(__dirname, "..", "scripts", "build_pptx_report.py");
}

function reportPythonPath() {
  return process.env.EE_PYTHON?.trim() || "python3";
}

function featureHashForReport(payloadForHash) {
  return createHash("sha256").update(JSON.stringify(payloadForHash ?? null)).digest("hex");
}

function featureHashForAccess(cadastreFeature) {
  return createHash("sha256").update(JSON.stringify(cadastreFeature?.geometry ?? null)).digest("hex");
}

function hashSecret(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function b64urlEncode(s) {
  return Buffer.from(s, "utf-8").toString("base64url");
}

function b64urlDecode(s) {
  return Buffer.from(s, "base64url").toString("utf-8");
}

function signSessionPayload(payloadJson) {
  return createHmac("sha256", SESSION_SECRET).update(payloadJson).digest("base64url");
}

function buildGuestToken(sessionId, expiresAtUnix) {
  const payloadJson = JSON.stringify({ sid: sessionId, exp: expiresAtUnix, v: 1 });
  const payloadB64 = b64urlEncode(payloadJson);
  const sig = signSessionPayload(payloadJson);
  return `${payloadB64}.${sig}`;
}

function parseAndVerifyGuestToken(token) {
  try {
    const [payloadB64, sig] = String(token ?? "").split(".");
    if (!payloadB64 || !sig) return null;
    const payloadJson = b64urlDecode(payloadB64);
    const expected = signSessionPayload(payloadJson);
    if (expected !== sig) return null;
    const payload = JSON.parse(payloadJson);
    if (!payload?.sid || !payload?.exp) return null;
    if (Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
    return { sid: String(payload.sid), exp: Number(payload.exp) };
  } catch {
    return null;
  }
}

function parseCookieValue(cookieHeader, name) {
  const all = String(cookieHeader ?? "");
  if (!all) return null;
  const parts = all.split(";").map((x) => x.trim());
  for (const p of parts) {
    if (!p.startsWith(`${name}=`)) continue;
    const v = p.slice(name.length + 1).trim();
    if (v) return decodeURIComponent(v);
  }
  return null;
}

async function ensureGuestSid(request, reply) {
  await pool.query(`DELETE FROM guest_sessions WHERE expires_at <= NOW()`);
  const existing = parseCookieValue(request.headers.cookie, GUEST_COOKIE);
  if (existing && SESSION_SECRET) {
    const parsed = parseAndVerifyGuestToken(existing);
    if (parsed?.sid) {
      const tokenHash = hashSecret(existing);
      const { rows } = await pool.query(
        `
          SELECT session_id
          FROM guest_sessions
          WHERE session_id = $1
            AND token_hash = $2
            AND expires_at > NOW()
          LIMIT 1
        `,
        [parsed.sid, tokenHash]
      );
      if (rows.length) return parsed.sid;
    }
  }

  const sid = randomUUID();
  const expUnix = Math.floor(Date.now() / 1000) + GUEST_SESSION_TTL_HOURS * 3600;
  const token = SESSION_SECRET ? buildGuestToken(sid, expUnix) : sid;
  const maxAge = GUEST_SESSION_TTL_HOURS * 3600;
  const isSecure = String(request.headers["x-forwarded-proto"] ?? "").includes("https");
  await pool.query(
    `
      INSERT INTO guest_sessions (session_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + ($3 || ' hours')::interval)
      ON CONFLICT (session_id) DO UPDATE
      SET token_hash = EXCLUDED.token_hash,
          expires_at = EXCLUDED.expires_at
    `,
    [sid, hashSecret(token), String(GUEST_SESSION_TTL_HOURS)]
  );
  reply.header(
    "Set-Cookie",
    `${GUEST_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`
  );
  return sid;
}

function baseUrlFromRequest(request) {
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost";
  const proto =
    (request.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim() ||
    (String(host).includes("localhost") || String(host).includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

async function hasActiveGrant(guestSid, cadastreNumber, featureHash) {
  if (!guestSid) return false;
  const { rows } = await pool.query(
    `
      SELECT grant_id
      FROM access_grants
      WHERE guest_sid = $1
        AND (cadastre_number IS NULL OR cadastre_number = $2)
        AND (feature_hash IS NULL OR feature_hash = $3)
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [guestSid, cadastreNumber ?? null, featureHash ?? null]
  );
  return rows.length > 0;
}

async function createGrant({ guestSid, cadastreNumber, featureHash, source }) {
  await pool.query(
    `
      INSERT INTO access_grants (grant_id, guest_sid, cadastre_number, feature_hash, source, expires_at)
      VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' days')::interval)
    `,
    [randomUUID(), guestSid, cadastreNumber ?? null, featureHash ?? null, source, String(ACCESS_GRANT_DAYS)]
  );
}

async function logPaymentEvent(intentId, eventType, payload = {}) {
  await pool.query(
    `
      INSERT INTO payment_events (event_id, intent_id, event_type, payload_json)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [randomUUID(), intentId, eventType, JSON.stringify(payload ?? {})]
  );
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function runReportBuilder(payload, outPathAbs) {
  return new Promise((resolve, reject) => {
    const child = spawn(reportPythonPath(), [reportScriptPath(), "--out", outPathAbs], {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code, signal) => {
      if (signal) {
        reject(new Error(`report builder terminated by signal: ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error((stderr || stdout || `report builder exit ${code}`).trim()));
        return;
      }
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

const activeReportJobs = new Set();

async function startReportBuildJob(jobId, payload) {
  if (activeReportJobs.has(jobId)) return;
  activeReportJobs.add(jobId);
  const outputRelPath = `${jobId}.pptx`;
  const outputAbsPath = join(REPORT_OUTPUT_DIR, outputRelPath);

  try {
    await pool.query(
      `
        UPDATE report_jobs
        SET status = 'building',
            started_at = NOW(),
            updated_at = NOW(),
            output_rel_path = $2,
            error_text = NULL
        WHERE job_id = $1
      `,
      [jobId, outputRelPath]
    );

    await runReportBuilder(payload, outputAbsPath);

    const ok = await fileExists(outputAbsPath);
    if (!ok) {
      throw new Error("report builder finished but output file is missing");
    }

    await pool.query(
      `
        UPDATE report_jobs
        SET status = 'ready',
            finished_at = NOW(),
            updated_at = NOW()
        WHERE job_id = $1
      `,
      [jobId]
    );
  } catch (err) {
    await pool.query(
      `
        UPDATE report_jobs
        SET status = 'failed',
            finished_at = NOW(),
            updated_at = NOW(),
            error_text = $2
        WHERE job_id = $1
      `,
      [jobId, String(err?.message ?? err).slice(0, 2000)]
    );
  } finally {
    activeReportJobs.delete(jobId);
  }
}

async function fetchCadastreFeature(code) {
  const url = new URL("https://nspd.gov.ru/api/geoportal/v2/search/geoportal");
  url.searchParams.set("thematicSearchId", "1");
  url.searchParams.set("query", code);
  url.searchParams.set("CRS", "EPSG:4326");

  const { ok, status, data: payload } = await httpsGetJson(url.toString(), NSPD_GEOSEARCH_HEADERS);
  if (!ok) {
    const err = new Error("NSPD_UPSTREAM");
    err.status = status;
    throw err;
  }

  const feature = payload?.data?.features?.[0];
  if (!feature) return null;

  const rawGeom = feature.geometry;
  const geometry = geometryAppearsWebMercator(rawGeom)
    ? normalizeCoordsToWgs84(rawGeom)
    : rawGeom;
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

async function getPolygonAreaSqMFromRing(ring) {
  const wkt = toPolygonWkt(ring);
  if (!wkt) return null;
  try {
    const { rows } = await pool.query(
      `SELECT ST_Area(ST_MakeValid(ST_GeomFromText($1, 4326))::geography) AS a`,
      [wkt]
    );
    const v = rows[0]?.a;
    if (v == null || !Number.isFinite(Number(v))) return null;
    return Number(v);
  } catch {
    return null;
  }
}

function rowsToFeatureCollection(rows) {
  return {
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      geometry: r.geometry,
      properties: r.properties ?? {}
    }))
  };
}

async function queryRiskLayer(sql, geomJson) {
  try {
    const { rows } = await pool.query(sql, [geomJson, RISK_MAP_HALF_EXTENT_METERS, RISK_MAP_LAYER_LIMIT]);
    return rowsToFeatureCollection(rows);
  } catch {
    return { type: "FeatureCollection", features: [] };
  }
}

async function searchCadastreByPolygonRing(ring, clientIp) {
  assertPolygonSearchRate(clientIp);
  const userWkt = toPolygonWkt(ring);
  const areaM2 = await getPolygonAreaSqMFromRing(ring);
  if (!userWkt || areaM2 === null) {
    return {
      status: 400,
      body: {
        message:
          "Не удалось обработать контур. Убедитесь, что полигон замкнут и не пересекает сам себя.",
        code: "POLYGON_INVALID"
      }
    };
  }
  if (areaM2 > MAX_POLYGON_AREA_M2) {
    const sotok = Math.round((areaM2 / 100) * 10) / 10;
    return {
      status: 400,
      body: {
        message: `Площадь выделенной области слишком большая (~${sotok} соток). Допустимо не более 200 соток (2 га). Сузьте выделение.`,
        code: "POLYGON_TOO_LARGE",
        areaM2: Math.round(areaM2)
      }
    };
  }

  const cadSet = new Set();
  const tryWms = async (bbox) => {
    const { ok, status, data } = await fetchWmsZuGetFeatureInfo(bbox);
    if (!ok) {
      const err = new Error("NSPD_WMS");
      err.status = status;
      throw err;
    }
    cadNumsFromWmsPayload(data).forEach((c) => cadSet.add(c));
  };

  await tryWms(ringToBbox3857String(ring));
  if (cadSet.size === 0) {
    const [cx, cy] = centroid3857(ring);
    await tryWms(bboxAroundPoint3857(cx, cy, 28));
  }

  const cadList = [...cadSet].slice(0, 40);
  const candidates = [];
  const chunkSize = 5;
  for (let i = 0; i < cadList.length; i += chunkSize) {
    const slice = cadList.slice(i, i + chunkSize);
    const settled = await Promise.all(
      slice.map(async (cad) => {
        try {
          const row = await lookupCadastreForPolygonSearch(cad);
          if (!row?.feature) return null;
          const hit = await geomIntersectsUserPoly(userWkt, row.feature);
          return hit
            ? {
                code: cad,
                feature: row.feature,
                summary: row.summary,
                rawProperties: row.rawProperties,
                cacheHit: row.cacheHit
              }
            : null;
        } catch {
          return null;
        }
      })
    );
    for (const row of settled) {
      if (row) candidates.push(row);
    }
    if (candidates.length >= MAX_POLYGON_CANDIDATES) break;
  }

  const trimmed = candidates.slice(0, MAX_POLYGON_CANDIDATES);
  if (!trimmed.length) {
    return {
      status: 404,
      body: {
        message: "В выделенной области не найдены земельные участки по данным НСПД. Попробуйте сузить область или ввести кадастровый номер.",
        code: "NO_PARCELS"
      }
    };
  }
  return { status: 200, body: { candidates: trimmed } };
}

/** Wait until Postgres accepts connections (Compose "healthy" can race with listen). */
async function waitForPoolReady(maxAttempts = 40, delayMs = 750) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
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
    CREATE OR REPLACE VIEW applications AS
    SELECT * FROM lead_submissions
  `);
  await pool.query(
    "COMMENT ON VIEW applications IS 'Заявки с сайта (зеркало lead_submissions; INSERT только в lead_submissions через API).'"
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_jobs (
      job_id TEXT PRIMARY KEY,
      feature_hash TEXT NOT NULL,
      cadastre_number TEXT NULL,
      payload_json JSONB NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'building', 'ready', 'failed')),
      output_rel_path TEXT NULL,
      error_text TEXT NULL,
      started_at TIMESTAMPTZ NULL,
      finished_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_report_jobs_feature_hash_created ON report_jobs (feature_hash, created_at DESC)"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_report_jobs_status_created ON report_jobs (status, created_at DESC)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      intent_id TEXT PRIMARY KEY,
      guest_sid TEXT NOT NULL,
      cadastre_number TEXT NULL,
      feature_hash TEXT NULL,
      tariff_code TEXT NOT NULL,
      amount_rub NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('created', 'paid', 'failed', 'cancelled')),
      provider_payment_id TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_payment_intents_guest_created ON payment_intents (guest_sid, created_at DESC)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      event_id TEXT PRIMARY KEY,
      intent_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_payment_events_intent_created ON payment_events (intent_id, created_at DESC)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_grants (
      grant_id TEXT PRIMARY KEY,
      guest_sid TEXT NOT NULL,
      cadastre_number TEXT NULL,
      feature_hash TEXT NULL,
      source TEXT NOT NULL CHECK (source IN ('payment', 'invite_link', 'invite_code', 'admin')),
      expires_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_access_grants_guest_expires ON access_grants (guest_sid, expires_at DESC)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_invites (
      invite_id TEXT PRIMARY KEY,
      cadastre_number TEXT NULL,
      feature_hash TEXT NULL,
      code_hash TEXT UNIQUE,
      token_hash TEXT UNIQUE,
      uses_limit INT NOT NULL DEFAULT 1,
      uses_count INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_access_invites_expires ON access_invites (expires_at)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guest_sessions (
      session_id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires ON guest_sessions (expires_at)"
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS oopt_areas (
      id SERIAL PRIMARY KEY,
      name_eng TEXT,
      geom geometry(MultiPolygon,4326) NOT NULL
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_oopt_areas_geom ON oopt_areas USING GIST (geom)");
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

  let feature;
  try {
    feature = await fetchCadastreFeature(code);
  } catch (err) {
    fastify.log.error(err);
    const msg = String(err?.message ?? err);
    const httpStatus = err?.status;
    if (msg.includes("certificate") || msg.includes("self-signed") || msg.includes("unable to verify")) {
      return reply.status(503).send({
        message:
          "Не удалось установить защищённое соединение с НСПД (TLS). На серверах с инспекцией HTTPS задайте NSPD_TLS_INSECURE=true в .env или подключите корпоративный CA через NODE_EXTRA_CA_CERTS.",
        code: "NSPD_TLS"
      });
    }
    if (httpStatus === 403 || httpStatus === 401 || httpStatus === 429) {
      return reply.status(503).send({
        message:
          "НСПД отклоняет запросы с IP этого сервера (часто у VPS/датацентров). Укажите в .env NSPD_HTTPS_PROXY на HTTP-прокси с «чистым» IP (например второй VPS), либо другой хостинг.",
        code: "NSPD_BLOCKED"
      });
    }
    return reply.status(502).send({
      message: "Сервис кадастровых данных временно недоступен. Попробуйте позже.",
      code: "NSPD_UPSTREAM"
    });
  }
  if (!feature) {
    return reply.status(404).send({ message: "Участок с таким кадастровым номером не найден в НСПД." });
  }

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

fastify.post("/api/cadastre/by-polygon", async (request, reply) => {
  const parsed = polygonRingSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Некорректный контур полигона",
      issues: parsed.error.flatten()
    });
  }
  const clientIp =
    request.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ?? request.ip;

  try {
    const result = await searchCadastreByPolygonRing(parsed.data.ring, clientIp);
    return reply.status(result.status).send(result.body);
  } catch (err) {
    fastify.log.error(err);
    const msg = String(err?.message ?? err);
    const httpStatus = err?.status;
    if (msg === "POLYGON_SEARCH_RATE" || httpStatus === 429) {
      return reply.status(429).send({
        message: "Слишком много запросов по полигону. Подождите минуту.",
        code: "POLYGON_SEARCH_RATE"
      });
    }
    if (msg === "NSPD_WMS") {
      if (httpStatus === 403 || httpStatus === 401 || httpStatus === 429) {
        return reply.status(503).send({
          message:
            "НСПД отклоняет запросы с IP этого сервера. Укажите NSPD_HTTPS_PROXY в .env или попробуйте позже.",
          code: "NSPD_BLOCKED"
        });
      }
      return reply.status(502).send({
        message: "Сервис кадастровых данных временно недоступен (WMS). Попробуйте позже.",
        code: "NSPD_WMS"
      });
    }
    if (msg.includes("certificate") || msg.includes("self-signed") || msg.includes("unable to verify")) {
      return reply.status(503).send({
        message:
          "Не удалось установить защищённое соединение с НСПД (TLS). Задайте NSPD_TLS_INSECURE=true или NODE_EXTRA_CA_CERTS.",
        code: "NSPD_TLS"
      });
    }
    return reply.status(500).send({
      message: "Внутренняя ошибка при поиске по полигону.",
      code: "INTERNAL"
    });
  }
});

fastify.post("/api/risk-map/overlays", async (request, reply) => {
  const parsed = riskMapRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Некорректная геометрия участка",
      issues: parsed.error.flatten()
    });
  }

  const cadastreFeature = parsed.data.cadastreFeature;
  const geomJson = JSON.stringify(cadastreFeature.geometry ?? null);
  if (!cadastreFeature.geometry) {
    return reply.status(400).send({ message: "Отсутствует геометрия участка" });
  }

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

  const baseEnvelopeCte = `
    WITH parcel AS (
      SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)) AS geom
    ),
    extent AS (
      SELECT ST_Transform(ST_Expand(ST_Transform(geom, 3857), $2::int), 4326) AS geom
      FROM parcel
    )
  `;

  const powerLinesSql = `
    ${baseEnvelopeCte},
    src AS (
      SELECT p.geom
      FROM power_lines p, extent e
      WHERE ST_Intersects(p.geom, e.geom)
      LIMIT $3
    ),
    merged AS (
      SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
    )
    SELECT
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
      jsonb_build_object('layer', 'power_lines', 'merged', true) AS properties
    FROM merged m
    WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
  `;

  const powerBuffersSql = `
    ${baseEnvelopeCte},
    src AS (
      SELECT p.geom
      FROM power_buffers p, extent e
      WHERE ST_Intersects(p.geom, e.geom)
      LIMIT $3
    ),
    merged AS (
      SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
    )
    SELECT
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
      jsonb_build_object('layer', 'power_buffers', 'merged', true) AS properties
    FROM merged m
    WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
  `;

  const waterSaveSql = `
    ${baseEnvelopeCte},
    src AS (
      SELECT w.geom
      FROM water_save w, extent e
      WHERE ST_Intersects(w.geom, e.geom)
      LIMIT $3
    ),
    merged AS (
      SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
    )
    SELECT
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
      jsonb_build_object('layer', 'water_save', 'merged', true) AS properties
    FROM merged m
    WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
  `;

  const waterBuffersSql = `
    ${baseEnvelopeCte},
    src AS (
      SELECT w.geom
      FROM river_lines_buffer w, extent e
      WHERE ST_Intersects(w.geom, e.geom)
      LIMIT $3
    ),
    merged AS (
      SELECT ST_UnaryUnion(ST_Collect(geom)) AS geom FROM src
    )
    SELECT
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(m.geom, 0.00001))::json AS geometry,
      jsonb_build_object('layer', 'river_lines_buffer', 'merged', true) AS properties
    FROM merged m
    WHERE m.geom IS NOT NULL AND NOT ST_IsEmpty(m.geom)
  `;

  const ooptSql = `
    ${baseEnvelopeCte}
    SELECT
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(o.geom, 0.00001))::json AS geometry,
      jsonb_build_object(
        'id', o.id,
        'name_eng', o.name_eng
      ) AS properties
    FROM oopt_areas o, extent e
    WHERE ST_Intersects(o.geom, e.geom)
    LIMIT $3
  `;

  const landuseIntersectSql = `
    WITH parcel AS (
      SELECT ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1::text), 4326)) AS geom
    )
    SELECT
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(l.geom, 0.00001))::json AS geometry,
      jsonb_build_object(
        'raw', l.raw,
        'landuse', l.landuse,
        'name', l.name,
        'risk', l.risk,
        'region', l.region
      ) AS properties
    FROM landuse_areas l, parcel p
    WHERE ST_Intersects(l.geom, p.geom)
      AND LOWER(COALESCE(l.risk, '')) IN ('средний', 'высокий', 'medium', 'high')
    LIMIT $3
  `;

  const [{ rows: parcelRows }, { rows: extentRows }] = await Promise.all([
    pool.query(parcelSql, [geomJson]),
    pool.query(extentSql, [geomJson, RISK_MAP_HALF_EXTENT_METERS])
  ]);

  const [powerLines, powerBuffers, waterSave, waterBuffers, ooptAreas, landuseIntersected] = await Promise.all([
    queryRiskLayer(powerLinesSql, geomJson),
    queryRiskLayer(powerBuffersSql, geomJson),
    queryRiskLayer(waterSaveSql, geomJson),
    queryRiskLayer(waterBuffersSql, geomJson),
    queryRiskLayer(ooptSql, geomJson),
    queryRiskLayer(landuseIntersectSql, geomJson)
  ]);

  const extentBox = {
    type: "Feature",
    geometry: extentRows[0]?.geometry ?? null,
    properties: { halfExtentMeters: RISK_MAP_HALF_EXTENT_METERS }
  };

  const clip = (fc) => clipFeatureCollectionToExtent(fc, extentBox);

  return reply.status(200).send({
    parcel: {
      type: "Feature",
      geometry: parcelRows[0]?.geometry ?? cadastreFeature.geometry,
      properties: cadastreFeature.properties ?? {}
    },
    extentBox,
    powerLines: clip(powerLines),
    powerBuffers: clip(powerBuffers),
    waterSave: clip(waterSave),
    waterBuffers: clip(waterBuffers),
    ooptAreas: clip(ooptAreas),
    landuseIntersected: clip(landuseIntersected)
  });
});

fastify.post("/api/terrain/nasadem", async (request, reply) => {
  if (!geeTerrainConfigured()) {
    return reply.status(503).send({
      message:
        "Рельеф NASADEM (Google Earth Engine) не настроен: в API-контейнере задайте GEE_PROJECT_ID и путь GOOGLE_APPLICATION_CREDENTIALS к JSON сервисного аккаунта. Инструкция — README, раздел «Google Earth Engine».",
      code: "GEE_NOT_CONFIGURED"
    });
  }

  const parsed = terrainRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Некорректное тело запроса",
      issues: parsed.error.flatten()
    });
  }

  let ringLatLng;
  let ringLonLat;
  if (parsed.data.cadastreFeature) {
    const rawGeom = parsed.data.cadastreFeature.geometry;
    const geom = geometryAppearsWebMercator(rawGeom) ? normalizeCoordsToWgs84(rawGeom) : rawGeom;
    ringLonLat = exteriorRingLonLatFromCadastreGeometry(geom);
    if (!ringLonLat) {
      return reply.status(400).send({
        message: "В cadastreFeature ожидается Polygon или MultiPolygon в WGS84",
        code: "BAD_GEOMETRY"
      });
    }
    ringLatLng = ringLonLat.map(([lon, lat]) => [lat, lon]);
  } else {
    ringLatLng = parsed.data.ring;
    ringLonLat = parsed.data.ring.map(([lat, lng]) => [lng, lat]);
  }

  const areaM2 = await getPolygonAreaSqMFromRing(ringLatLng);
  if (areaM2 === null) {
    return reply.status(400).send({ message: "Не удалось вычислить площадь полигона", code: "AREA_FAIL" });
  }
  // Лимит 50 соток только для ручного контура на карте (by-polygon); кадастровый участок любой площади — ок.

  const result = runNasademTerrainStats(ringLonLat);
  if (!result.ok) {
    fastify.log.error({ err: result.error, code: result.code }, "nasadem terrain");
    return reply.status(502).send({
      message: result.error || "Ошибка Earth Engine",
      code: result.code || "EE_FAILED"
    });
  }

  return reply.status(200).send({
    maxSlopeDeg: result.maxSlopeDeg,
    elevationM: result.elevationM,
    source: "NASA/NASADEM_HGT/001",
    scaleMeters: 30
  });
});

fastify.post("/api/access/status", async (request, reply) => {
  const parsed = accessStatusSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Некорректное тело запроса", issues: parsed.error.flatten() });
  }
  const guestSid = await ensureGuestSid(request, reply);
  const featureHash = featureHashForAccess(parsed.data.cadastreFeature);
  const allowed = await hasActiveGrant(guestSid, parsed.data.cadastreNumber ?? null, featureHash);
  return reply.status(200).send({ allowed });
});

fastify.post("/api/payments/robokassa/create", async (request, reply) => {
  const parsed = paymentCreateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Некорректное тело запроса", issues: parsed.error.flatten() });
  }

  const guestSid = await ensureGuestSid(request, reply);
  const amount = 280.0;
  const intentId = randomUUID();
  const cadastreNumber = parsed.data.cadastreNumber ?? null;
  const featureHash = featureHashForAccess(parsed.data.cadastreFeature);

  await pool.query(
    `
      INSERT INTO payment_intents (intent_id, guest_sid, cadastre_number, feature_hash, tariff_code, amount_rub, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'created')
    `,
    [intentId, guestSid, cadastreNumber, featureHash, parsed.data.tariffCode, amount]
  );
  await logPaymentEvent(intentId, "intent_created", {
    guestSid,
    cadastreNumber,
    featureHash,
    tariffCode: parsed.data.tariffCode,
    amountRub: amount
  });

  const baseUrl = baseUrlFromRequest(request);
  if (!ROBOKASSA_MERCHANT_LOGIN || !ROBOKASSA_PASS1) {
    return reply.status(200).send({
      intentId,
      paymentUrl: `${baseUrl}/api/payments/dev/success?intentId=${encodeURIComponent(intentId)}`,
      mode: "dev-mock"
    });
  }

  const outSum = amount.toFixed(2);
  const signature = createHash("md5")
    .update(`${ROBOKASSA_MERCHANT_LOGIN}:${outSum}:${intentId}:${ROBOKASSA_PASS1}`)
    .digest("hex");

  const params = new URLSearchParams({
    MerchantLogin: ROBOKASSA_MERCHANT_LOGIN,
    OutSum: outSum,
    InvId: intentId,
    Description: `GeoRisk report ${cadastreNumber ?? ""}`.trim(),
    SignatureValue: signature,
    IsTest: ROBOKASSA_TEST_MODE ? "1" : "0"
  });

  return reply.status(200).send({
    intentId,
    paymentUrl: `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`,
    mode: "robokassa"
  });
});

fastify.get("/api/payments/dev/success", async (request, reply) => {
  const intentId = String(request.query?.intentId ?? "").trim();
  if (!intentId) return reply.status(400).send({ message: "intentId обязателен" });
  const guestSid = await ensureGuestSid(request, reply);

  const { rows } = await pool.query(
    `
      UPDATE payment_intents
      SET status = 'paid', updated_at = NOW()
      WHERE intent_id = $1
      RETURNING intent_id, cadastre_number, feature_hash
    `,
    [intentId]
  );
  if (!rows.length) return reply.status(404).send({ message: "Платеж не найден" });
  await logPaymentEvent(intentId, "paid_dev_mock", { guestSid });

  await createGrant({
    guestSid,
    cadastreNumber: rows[0].cadastre_number,
    featureHash: rows[0].feature_hash,
    source: "payment"
  });
  return reply.redirect("/risk-map");
});

fastify.post("/api/payments/robokassa/result", async (request, reply) => {
  const outSum = String(request.body?.OutSum ?? "").trim();
  const invId = String(request.body?.InvId ?? "").trim();
  const signatureValue = String(request.body?.SignatureValue ?? "").trim().toLowerCase();
  if (!outSum || !invId || !signatureValue || !ROBOKASSA_PASS2) return reply.status(400).send("bad request");

  const expected = createHash("md5").update(`${outSum}:${invId}:${ROBOKASSA_PASS2}`).digest("hex");
  if (expected.toLowerCase() !== signatureValue) return reply.status(403).send("bad sign");

  const { rows } = await pool.query(
    `
      UPDATE payment_intents
      SET status = 'paid', provider_payment_id = $2, updated_at = NOW()
      WHERE intent_id = $1
      RETURNING guest_sid, cadastre_number, feature_hash
    `,
    [invId, invId]
  );
  if (rows.length) {
    await logPaymentEvent(invId, "paid_callback", { outSum });
    await createGrant({
      guestSid: rows[0].guest_sid,
      cadastreNumber: rows[0].cadastre_number,
      featureHash: rows[0].feature_hash,
      source: "payment"
    });
  }
  return reply.type("text/plain").send(`OK${invId}`);
});

fastify.get("/api/payments/robokassa/success", async (request, reply) => {
  const invId = String(request.query?.InvId ?? "").trim();
  if (!invId) return reply.redirect("/risk-map");

  const guestSid = await ensureGuestSid(request, reply);
  const { rows } = await pool.query(
    `
      SELECT cadastre_number, feature_hash, status
      FROM payment_intents
      WHERE intent_id = $1
      LIMIT 1
    `,
    [invId]
  );
  if (rows.length && rows[0].status === "paid") {
    await createGrant({
      guestSid,
      cadastreNumber: rows[0].cadastre_number,
      featureHash: rows[0].feature_hash,
      source: "payment"
    });
  }
  return reply.redirect("/risk-map");
});

fastify.post("/api/access/invite/create", async (request, reply) => {
  if (!ACCESS_ADMIN_SECRET || request.headers["x-admin-secret"] !== ACCESS_ADMIN_SECRET) {
    return reply.status(403).send({ message: "forbidden" });
  }
  const parsed = createInviteSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Некорректное тело запроса", issues: parsed.error.flatten() });
  }

  const featureHash = parsed.data.cadastreFeature ? featureHashForAccess(parsed.data.cadastreFeature) : null;
  const cadastreNumber = parsed.data.cadastreNumber ?? null;
  const ttlHours = parsed.data.ttlHours ?? 168;
  const usesLimit = parsed.data.usesLimit ?? 1;
  const inviteId = randomUUID();
  const code = randomBytes(6).toString("hex");
  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");

  await pool.query(
    `
      INSERT INTO access_invites (
        invite_id, cadastre_number, feature_hash, code_hash, token_hash, uses_limit, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' hours')::interval)
    `,
    [inviteId, cadastreNumber, featureHash, hashSecret(code), hashSecret(token), usesLimit, String(ttlHours)]
  );

  const baseUrl = baseUrlFromRequest(request);
  const cadNumQuery = cadastreNumber ? `&cadastreNumber=${encodeURIComponent(cadastreNumber)}` : "";
  return reply.status(200).send({
    inviteId,
    code,
    link: `${baseUrl}/risk-map?inviteToken=${encodeURIComponent(token)}${cadNumQuery}`
  });
});

fastify.post("/api/access/activate/code", async (request, reply) => {
  const parsed = activateCodeSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Некорректное тело запроса", issues: parsed.error.flatten() });
  }
  const guestSid = await ensureGuestSid(request, reply);
  const inputCode = parsed.data.code.trim();
  if (ACCESS_MASTER_CODE && inputCode === ACCESS_MASTER_CODE) {
    if (!parsed.data.cadastreFeature) {
      return reply.status(400).send({ message: "Для мастер-кода нужен cadastreFeature" });
    }
    await createGrant({
      guestSid,
      cadastreNumber: parsed.data.cadastreNumber ?? null,
      featureHash: featureHashForAccess(parsed.data.cadastreFeature),
      source: "admin"
    });
    return reply.status(200).send({ ok: true, mode: "master_code" });
  }
  const wantedHash = parsed.data.cadastreFeature ? featureHashForAccess(parsed.data.cadastreFeature) : null;
  const codeHash = hashSecret(inputCode);

  const { rows } = await pool.query(
    `
      SELECT invite_id, cadastre_number, feature_hash
      FROM access_invites
      WHERE code_hash = $1
        AND expires_at > NOW()
        AND uses_count < uses_limit
      LIMIT 1
    `,
    [codeHash]
  );
  if (!rows.length) return reply.status(404).send({ message: "Код недействителен" });
  const row = rows[0];
  if (row.feature_hash && wantedHash && row.feature_hash !== wantedHash) {
    return reply.status(403).send({ message: "Код не подходит для этого участка" });
  }

  await pool.query(`UPDATE access_invites SET uses_count = uses_count + 1 WHERE invite_id = $1`, [row.invite_id]);
  await createGrant({
    guestSid,
    cadastreNumber: row.cadastre_number,
    featureHash: row.feature_hash,
    source: "invite_code"
  });
  return reply.status(200).send({ ok: true });
});

fastify.get("/api/access/activate/link", async (request, reply) => {
  const token = String(request.query?.token ?? "").trim();
  if (!token) return reply.status(400).send({ message: "token обязателен" });
  const guestSid = await ensureGuestSid(request, reply);

  const { rows } = await pool.query(
    `
      SELECT invite_id, cadastre_number, feature_hash
      FROM access_invites
      WHERE token_hash = $1
        AND expires_at > NOW()
        AND uses_count < uses_limit
      LIMIT 1
    `,
    [hashSecret(token)]
  );
  if (!rows.length) return reply.status(404).send({ message: "Ссылка недействительна" });
  const row = rows[0];
  await pool.query(`UPDATE access_invites SET uses_count = uses_count + 1 WHERE invite_id = $1`, [row.invite_id]);
  await createGrant({
    guestSid,
    cadastreNumber: row.cadastre_number,
    featureHash: row.feature_hash,
    source: "invite_link"
  });
  return reply.status(200).send({ ok: true });
});

fastify.post("/api/report/build", async (request, reply) => {
  const parsed = reportBuildSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Некорректное тело запроса",
      issues: parsed.error.flatten()
    });
  }

  const feature = parsed.data.cadastreFeature;
  const hashPayload = {
    v: REPORT_PIPELINE_VERSION,
    geometry: feature?.geometry ?? null,
    riskSummary: parsed.data.riskSummary ?? [],
    terrain: parsed.data.terrain ?? null
  };
  const fh = featureHashForReport(hashPayload);
  const payload = {
    cadastreNumber: parsed.data.cadastreNumber ?? null,
    cadastreFeature: feature,
    riskSummary: parsed.data.riskSummary ?? [],
    mapOverlays: parsed.data.mapOverlays ?? null,
    terrain: parsed.data.terrain ?? null
  };
  const guestSid = await ensureGuestSid(request, reply);
  const accessHash = featureHashForAccess(feature);
  const allowed = await hasActiveGrant(guestSid, parsed.data.cadastreNumber ?? null, accessHash);
  if (!allowed) {
    return reply.status(402).send({ message: "Требуется оплата", code: "PAYMENT_REQUIRED" });
  }

  if (!REPORT_DISABLE_CACHE) {
    const cached = await pool.query(
      `
        SELECT job_id, status, output_rel_path, error_text
        FROM report_jobs
        WHERE feature_hash = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [fh]
    );
    if (cached.rows.length) {
      const row = cached.rows[0];
      if (row.status === "ready" || row.status === "building" || row.status === "queued") {
        return reply.status(200).send({
          jobId: row.job_id,
          status: row.status,
          downloadUrl: row.status === "ready" ? `/api/report/download/${row.job_id}` : null
        });
      }
    }
  }

  const jobId = randomUUID();
  await pool.query(
    `
      INSERT INTO report_jobs (job_id, feature_hash, cadastre_number, payload_json, status)
      VALUES ($1, $2, $3, $4::jsonb, 'queued')
    `,
    [jobId, fh, parsed.data.cadastreNumber ?? null, JSON.stringify(payload)]
  );

  void startReportBuildJob(jobId, payload);

  return reply.status(202).send({ jobId, status: "queued" });
});

fastify.get("/api/report/status/:jobId", async (request, reply) => {
  const parsed = reportStatusParamsSchema.safeParse(request.params ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ message: "Некорректный jobId" });
  }

  const { rows } = await pool.query(
    `
      SELECT job_id, status, error_text, output_rel_path
      FROM report_jobs
      WHERE job_id = $1
      LIMIT 1
    `,
    [parsed.data.jobId]
  );
  if (!rows.length) {
    return reply.status(404).send({ message: "Задача отчета не найдена", code: "REPORT_JOB_NOT_FOUND" });
  }
  const row = rows[0];
  return reply.status(200).send({
    jobId: row.job_id,
    status: row.status,
    error: row.error_text ?? null,
    downloadUrl: row.status === "ready" ? `/api/report/download/${row.job_id}` : null
  });
});

fastify.get("/api/report/download/:jobId", async (request, reply) => {
  const parsed = reportStatusParamsSchema.safeParse(request.params ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ message: "Некорректный jobId" });
  }
  const { rows } = await pool.query(
    `
      SELECT job_id, status, output_rel_path, cadastre_number, feature_hash
      FROM report_jobs
      WHERE job_id = $1
      LIMIT 1
    `,
    [parsed.data.jobId]
  );
  if (!rows.length) {
    return reply.status(404).send({ message: "Задача отчета не найдена", code: "REPORT_JOB_NOT_FOUND" });
  }
  const row = rows[0];
  const guestSid = await ensureGuestSid(request, reply);
  const allowed = await hasActiveGrant(guestSid, row.cadastre_number ?? null, row.feature_hash ?? null);
  if (!allowed) {
    return reply.status(402).send({ message: "Требуется оплата", code: "PAYMENT_REQUIRED" });
  }
  if (row.status !== "ready" || !row.output_rel_path) {
    return reply.status(409).send({ message: "Отчет еще не готов", code: "REPORT_NOT_READY", status: row.status });
  }

  const absPath = join(REPORT_OUTPUT_DIR, row.output_rel_path);
  if (!(await fileExists(absPath))) {
    return reply
      .status(410)
      .send({ message: "Файл отчета не найден на диске", code: "REPORT_FILE_MISSING" });
  }

  const fallbackName = `report-${row.job_id}.pptx`;
  reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  reply.header("Content-Disposition", `attachment; filename=\"${fallbackName}\"`);
  return reply.send(createReadStream(absPath));
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
  const polygonGeoJson = toPolygonGeoJsonForInsert(polygonCoords);
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
        CASE WHEN $6 IS NOT NULL THEN ST_SetSRID(ST_GeomFromGeoJSON($6::text), 4326) ELSE NULL END,
        $7,
        $8
      )
      RETURNING id, created_at
    `,
    [
      name,
      phone,
      cadastreNumber ?? null,
      JSON.stringify(cadastreFeature ?? null),
      polygonWkt,
      polygonGeoJson,
      clientIp,
      userAgent
    ]
  );

  return reply.status(201).send({
    id: result.rows[0].id,
    createdAt: result.rows[0].created_at
  });
});

async function start() {
  await waitForPoolReady();
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
