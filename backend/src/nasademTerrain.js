import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function nasademScriptPath() {
  return process.env.EE_NASADEM_SCRIPT?.trim() || join(__dirname, "..", "scripts", "ee_nasadem_stats.py");
}

export function eePythonPath() {
  return process.env.EE_PYTHON?.trim() || "python3";
}

/**
 * @param {Array<[number, number]>} ringLonLat — кольцо в WGS84, порядок GeoJSON [lon, lat]
 * @returns {{ ok: true, maxSlopeDeg: number|null, elevationM: number|null } | { ok: false, error: string, code?: string }}
 */
export function runNasademTerrainStats(ringLonLat) {
  const py = eePythonPath();
  const script = nasademScriptPath();
  const payload = JSON.stringify({ ring: ringLonLat });

  const child = spawnSync(py, [script], {
    input: payload,
    encoding: "utf-8",
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
    timeout: Number(process.env.EE_REQUEST_TIMEOUT_MS ?? 120_000)
  });

  if (child.error) {
    return { ok: false, error: String(child.error?.message || child.error), code: "EE_SPAWN" };
  }
  if (child.signal) {
    return { ok: false, error: `Earth Engine: процесс завершён сигналом ${child.signal}`, code: "EE_SIGNAL" };
  }

  const out = (child.stdout || "").trim();
  if (!out) {
    const err = (child.stderr || "").trim() || "пустой ответ скрипта";
    return { ok: false, error: err, code: "EE_EMPTY" };
  }

  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch {
    return { ok: false, error: "Некорректный JSON от скрипта Earth Engine", code: "EE_JSON" };
  }

  if (parsed.error) {
    return { ok: false, error: String(parsed.error), code: "EE_RUNTIME" };
  }

  if (child.status !== 0) {
    return { ok: false, error: `скрипт завершился с кодом ${child.status}`, code: "EE_STATUS" };
  }

  return {
    ok: true,
    maxSlopeDeg: parsed.maxSlopeDeg ?? null,
    elevationM: parsed.elevationM ?? null
  };
}

export function geeTerrainConfigured() {
  const project = (process.env.GEE_PROJECT_ID || "").trim();
  const key = (process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  return Boolean(project && key);
}
