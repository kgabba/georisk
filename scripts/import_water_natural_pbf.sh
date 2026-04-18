#!/usr/bin/env bash
# Импорт полигонов natural=water из OSM PBF в PostGIS (таблица water_objects).
# Атрибуты: water (из тега water=*, если есть), name.
#
# Использование:
#   ./scripts/import_water_natural_pbf.sh [путь/к/файлу.osm.pbf]
#
# Примеры:
#   ./scripts/import_water_natural_pbf.sh data/landuse/landuse-test-bbox.osm.pbf
#   ./scripts/import_water_natural_pbf.sh data/landuse/euro-rus.osm.pbf

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
STAGING="water_natural_staging"

echo "Источник: $PBF_PATH"
echo "Создание таблицы water_objects…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
DROP TABLE IF EXISTS ${STAGING};
DROP TABLE IF EXISTS water_objects CASCADE;
CREATE TABLE water_objects (
  id BIGSERIAL PRIMARY KEY,
  water TEXT,
  name TEXT,
  geom geometry(MultiPolygon,4326) NOT NULL
);
CREATE INDEX idx_water_objects_geom ON water_objects USING GIST (geom);
CREATE INDEX idx_water_objects_name ON water_objects (name);
SQL

echo "Импорт в staging: слой multipolygons, natural = 'water'"
docker run --rm \
  --network "$NET" \
  -e OGR_GEOMETRY_ACCEPT_UNCLOSED_RING=YES \
  -v "$PBF_DIR:/import:ro" \
  ghcr.io/osgeo/gdal:alpine-small-latest \
  ogr2ogr -overwrite \
  -f PostgreSQL "PG:$PG_CONN" "/import/${PBF_BASE}" multipolygons \
  -nln "${STAGING}" \
  -where "natural = 'water'" \
  -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom

echo "Перенос в water_objects (water из тега water=*, name из name)…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO water_objects (water, name, geom)
SELECT
  NULLIF(BTRIM(COALESCE(substring(s.other_tags from '\"water\"=>\"([^\"]*)\"'), '')), '') AS water,
  NULLIF(BTRIM(COALESCE(s.name, '')), '') AS name,
  ST_Multi(s.geom)::geometry(MultiPolygon, 4326) AS geom
FROM ${STAGING} AS s
WHERE s.geom IS NOT NULL;

DROP TABLE IF EXISTS ${STAGING};
SQL

echo "Готово."
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS cnt FROM water_objects;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT water, name FROM water_objects ORDER BY random() LIMIT 5;"
