import https from "node:https";
import Fastify from "fastify";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Pool } from "pg";
import { z } from "zod";

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
const MAX_POLYGON_AREA_M2 = 50 * 100;
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

  const { ok, status, data: payload } = await httpsGetJson(url.toString(), NSPD_GEOSEARCH_HEADERS);
  if (!ok) {
    const err = new Error("NSPD_UPSTREAM");
    err.status = status;
    throw err;
  }

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
        message: `Площадь выделенной области слишком большая (~${sotok} соток). Допустимо не более 50 соток (0,5 га). Сузьте выделение.`,
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
