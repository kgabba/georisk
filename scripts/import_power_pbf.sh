#!/usr/bin/env bash
# Импорт всех линейных объектов power=* из OSM PBF в PostGIS.
# Таблица назначения: public.power_lines
#
# Использование:
#   ./scripts/import_power_pbf.sh [путь/к/файлу.osm.pbf]
#   ./scripts/import_power_pbf.sh data/landuse/russia-260412.osm.pbf
#
# Важно: скрипт пересоздаёт таблицу power_lines при каждом запуске (DROP + CREATE).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Нет файла .env в $ROOT — скопируйте из .env.example и задайте POSTGRES_*" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

PBF_PATH="${1:-$ROOT/data/landuse/russia-260412.osm.pbf}"
if [[ "$PBF_PATH" != /* ]]; then
  PBF_PATH="$ROOT/$PBF_PATH"
fi

if [[ ! -f "$PBF_PATH" ]]; then
  echo "Не найден PBF: $PBF_PATH" >&2
  exit 1
fi

PBF_DIR="$(dirname "$PBF_PATH")"
PBF_BASE="$(basename "$PBF_PATH")"
NET="${COMPOSE_PROJECT_NAME:-georisk}_webnet"
if ! docker network inspect "$NET" &>/dev/null; then
  NET="georisk_webnet"
fi

PG_CONN="host=db port=5432 dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}"
STAGING="power_lines_staging"

echo "Источник: $PBF_PATH"
echo "Создание таблицы power_lines…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
DROP TABLE IF EXISTS ${STAGING};
DROP TABLE IF EXISTS power_lines CASCADE;
CREATE TABLE power_lines (
  id BIGSERIAL PRIMARY KEY,
  osm_id BIGINT,
  power TEXT NOT NULL,
  name TEXT,
  operator TEXT,
  ref TEXT,
  voltage_raw TEXT,
  voltage_kv NUMERIC,
  voltage_kv_min NUMERIC,
  voltage_kv_max NUMERIC,
  circuits INTEGER,
  cables INTEGER,
  frequency TEXT,
  source_file TEXT NOT NULL,
  geom geometry(MultiLineString,4326) NOT NULL
);
CREATE INDEX idx_power_lines_geom ON power_lines USING GIST (geom);
CREATE INDEX idx_power_lines_power ON power_lines (power);
CREATE INDEX idx_power_lines_voltage_kv ON power_lines (voltage_kv);
CREATE INDEX idx_power_lines_osm_id ON power_lines (osm_id);
SQL

echo "Импорт в staging ${STAGING}: слой lines, OGR -where \"other_tags LIKE '%\\\"power\\\"=>%'\""
docker run --rm \
  --network "$NET" \
  -v "$PBF_DIR:/import:ro" \
  ghcr.io/osgeo/gdal:alpine-small-latest \
  ogr2ogr -overwrite \
  -f PostgreSQL "PG:$PG_CONN" "/import/${PBF_BASE}" lines \
  -nln "${STAGING}" \
  -where "other_tags LIKE '%\"power\"=>%'" \
  -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom

echo "Перенос в power_lines…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO power_lines (
  osm_id, power, name, operator, ref, voltage_raw, circuits, cables, frequency, source_file, geom
)
SELECT
  s.osm_id::bigint,
  NULLIF(
    BTRIM(
      COALESCE(
        substring(s.other_tags from '\"power\"=>\"([^\"]*)\"'),
        ''
      )
    ),
    ''
  ) AS power,
  NULLIF(BTRIM(COALESCE(s.name, '')), '') AS name,
  NULLIF(BTRIM(COALESCE(substring(s.other_tags from '\"operator\"=>\"([^\"]*)\"'), '')), '') AS operator,
  NULLIF(BTRIM(COALESCE(substring(s.other_tags from '\"ref\"=>\"([^\"]*)\"'), '')), '') AS ref,
  NULLIF(BTRIM(COALESCE(substring(s.other_tags from '\"voltage\"=>\"([^\"]*)\"'), '')), '') AS voltage_raw,
  CASE WHEN NULLIF(regexp_replace(COALESCE(substring(s.other_tags from '\"circuits\"=>\"([^\"]*)\"'), ''), '[^0-9-]', '', 'g'), '') IS NOT NULL
       THEN NULLIF(regexp_replace(COALESCE(substring(s.other_tags from '\"circuits\"=>\"([^\"]*)\"'), ''), '[^0-9-]', '', 'g'), '')::integer
       ELSE NULL END AS circuits,
  CASE WHEN NULLIF(regexp_replace(COALESCE(substring(s.other_tags from '\"cables\"=>\"([^\"]*)\"'), ''), '[^0-9-]', '', 'g'), '') IS NOT NULL
       THEN NULLIF(regexp_replace(COALESCE(substring(s.other_tags from '\"cables\"=>\"([^\"]*)\"'), ''), '[^0-9-]', '', 'g'), '')::integer
       ELSE NULL END AS cables,
  NULLIF(BTRIM(COALESCE(substring(s.other_tags from '\"frequency\"=>\"([^\"]*)\"'), '')), '') AS frequency,
  '${PBF_BASE}' AS source_file,
  ST_Multi(s.geom)::geometry(MultiLineString,4326) AS geom
FROM ${STAGING} s
WHERE s.geom IS NOT NULL
  AND NULLIF(BTRIM(COALESCE(substring(s.other_tags from '\"power\"=>\"([^\"]*)\"'), '')), '') IS NOT NULL;

DROP TABLE IF EXISTS ${STAGING};
SQL

echo "Нормализация voltage_raw -> voltage_kv/min/max…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
WITH tokens AS (
  SELECT
    p.id,
    regexp_split_to_table(
      regexp_replace(
        lower(
          replace(
            replace(
              replace(
                replace(coalesce(p.voltage_raw, ''), 'кв', 'kv'),
                'кв.', 'kv'
              ),
              'в', ''
            ),
            'kv', ''
          )
        ),
        '[^0-9,;./ ]',
        '',
        'g'
      ),
      '[,;/ ]+'
    ) AS token
  FROM power_lines p
  WHERE p.voltage_raw IS NOT NULL
),
parsed AS (
  SELECT
    id,
    CASE
      WHEN token ~ '^[0-9]+(\.[0-9]+)?$' THEN
        CASE
          WHEN token::numeric > 1000 THEN token::numeric / 1000
          ELSE token::numeric
        END
      ELSE NULL
    END AS kv
  FROM tokens
),
agg AS (
  SELECT
    id,
    MIN(kv) AS min_kv,
    MAX(kv) AS max_kv
  FROM parsed
  WHERE kv IS NOT NULL
  GROUP BY id
)
UPDATE power_lines p
SET
  voltage_kv_min = a.min_kv,
  voltage_kv_max = a.max_kv,
  voltage_kv = a.max_kv
FROM agg a
WHERE p.id = a.id;
SQL

echo "Готово. Проверка:"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS total FROM power_lines;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FILTER (WHERE voltage_raw IS NOT NULL) AS with_voltage_raw, COUNT(*) FILTER (WHERE voltage_kv IS NOT NULL) AS with_voltage_kv FROM power_lines;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT power, COUNT(*) AS cnt FROM power_lines GROUP BY power ORDER BY cnt DESC LIMIT 20;"
