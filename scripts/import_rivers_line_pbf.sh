#!/usr/bin/env bash
# Линейные waterway из OSM PBF → PostGIS, таблица rivers_line.
# Фильтр: waterway IN ('river','stream','canal','tidal_channel').
# Поля: waterway, name (+ geom MultiLineString 4326).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Нет файла .env в $ROOT" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

PBF_PATH="${1:-$ROOT/data/landuse/euro-rus.osm.pbf}"
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
STAGING="rivers_line_staging"

WHERE_FILTER="waterway IN ('river','stream','canal','tidal_channel')"

echo "Источник: $PBF_PATH"
echo "Создание таблицы rivers_line…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
DROP TABLE IF EXISTS ${STAGING};
DROP TABLE IF EXISTS rivers_line CASCADE;
CREATE TABLE rivers_line (
  id BIGSERIAL PRIMARY KEY,
  waterway TEXT NOT NULL,
  name TEXT,
  geom geometry(MultiLineString, 4326) NOT NULL
);
CREATE INDEX idx_rivers_line_geom ON rivers_line USING GIST (geom);
CREATE INDEX idx_rivers_line_waterway ON rivers_line (waterway);
SQL

echo "Импорт в staging: слой lines, ${WHERE_FILTER}"
docker run --rm \
  --network "$NET" \
  -v "$PBF_DIR:/import:ro" \
  ghcr.io/osgeo/gdal:alpine-small-latest \
  ogr2ogr -overwrite \
  -f PostgreSQL "PG:$PG_CONN" "/import/${PBF_BASE}" lines \
  -nln "${STAGING}" \
  -where "${WHERE_FILTER}" \
  -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom

echo "Перенос в rivers_line…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO rivers_line (waterway, name, geom)
SELECT
  NULLIF(BTRIM(COALESCE(s.waterway, '')), '') AS waterway,
  NULLIF(BTRIM(COALESCE(s.name, '')), '') AS name,
  ST_Multi(s.geom)::geometry(MultiLineString, 4326) AS geom
FROM ${STAGING} AS s
WHERE s.geom IS NOT NULL
  AND NULLIF(BTRIM(COALESCE(s.waterway, '')), '') IS NOT NULL;

DROP TABLE IF EXISTS ${STAGING};
SQL

echo "Готово."
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS cnt FROM rivers_line;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT waterway, COUNT(*) FROM rivers_line GROUP BY 1 ORDER BY 2 DESC;"
