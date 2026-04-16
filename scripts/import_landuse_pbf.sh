#!/usr/bin/env bash
# Импорт землепользования из OSM PBF в PostGIS.
#
# ЧТО ИМЕННО ТЯНЕМ (это важно для сравнения с «миллионами» у тебя):
#   • Драйвер GDAL/OSM, слой **multipolygons** (площадные объекты, собранные из way/relation).
#   • Фильтр ogr2ogr **-where** = только объекты с непустым тегом **landuse** (значение OSM-ключа landuse).
#   • НЕ тянем: points/lines без площади, другие ключи (natural/leisure/…), если ты считал их в своей цифре —
#     тогда объёмы будут другие.
#   • Число строк = сколько таких полигонов **внутри твоего PBF-файла**. Файл **landuse-test-bbox.osm.pbf (~40 МБ)**
#     — это маленький bbox (условно кусок города), там десятки тысяч — нормально. **~1.3M / ~10M** бывают на
#     **большом вырезке России** (например data/landuse/russia-*.osm.pbf, гигабайты) или на полном импорте;
#     для этого же скрипта передай путь к большому PBF и при необходимости **-spat** (см. ниже).
#   • Для очень больших выборок иногда используют osm2pgsql/imposm вместо ogr2ogr — иначе долго и много места
#     под временные файлы GDAL.
#
# Словарь подписей/риска: scripts/landuse_mapping.json (неизвестный raw -> «Отсутствует», «низкий»).
#
# Использование:
#   ./scripts/import_landuse_pbf.sh [путь/к/файлу.osm.pbf] [region] [xmin ymin xmax ymax]
#
# Примеры:
#   ./scripts/import_landuse_pbf.sh
#   ./scripts/import_landuse_pbf.sh data/landuse/landuse-test-bbox.osm.pbf volga
#   ./scripts/import_landuse_pbf.sh data/landuse/russia-260412.osm.pbf volga 30 50 40 60
#
# Требуется: docker compose с сервисами db (+ сеть), образ ghcr.io/osgeo/gdal:alpine-small-latest.

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

PBF_PATH="${1:-$ROOT/data/landuse/landuse-test-bbox.osm.pbf}"
if [[ "$PBF_PATH" != /* ]]; then
  PBF_PATH="$ROOT/$PBF_PATH"
fi
REGION="${2:-volga}"

if [[ ! -f "$PBF_PATH" ]]; then
  echo "Не найден PBF: $PBF_PATH" >&2
  exit 1
fi

if [[ "${REGION}" =~ [^a-zA-Z0-9_-] ]]; then
  echo "Недопустимое значение region: $REGION" >&2
  exit 1
fi

# Опционально: ограничение по bbox (ogr2ogr -spat в единицах слоя, для OSM PBF — градусы WGS84)
SPAT_ARGS=()
if [[ $# -ge 6 ]]; then
  SPAT_ARGS=( -spat "$3" "$4" "$5" "$6" )
fi

PBF_DIR="$(dirname "$PBF_PATH")"
PBF_BASE="$(basename "$PBF_PATH")"
NET="${COMPOSE_PROJECT_NAME:-georisk}_webnet"
if ! docker network inspect "$NET" &>/dev/null; then
  NET="georisk_webnet"
fi

PG_CONN="host=db port=5432 dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}"
STAGING="landuse_pbf_staging"
MAP_JSON="$ROOT/scripts/landuse_mapping.json"
EMIT_PY="$ROOT/scripts/emit_landuse_mapping_sql.py"

if [[ ! -f "$MAP_JSON" ]]; then
  echo "Не найден $MAP_JSON" >&2
  exit 1
fi

PBF_BYTES="$(wc -c < "$PBF_PATH" | tr -d ' ')"
PBF_MB=$((PBF_BYTES / 1048576))
echo "Источник: $PBF_PATH (${PBF_MB} МиБ)"
if [[ "$PBF_MB" -lt 256 ]]; then
  echo "Внимание: маленький PBF — ожидай порядок величины тысячи/десятки тысяч полигонов с landuse, не миллионы." >&2
  echo "Для масштаба России используй большой extract (например russia-*.osm.pbf, несколько ГБ) и при необходимости -spat." >&2
fi

echo "Создание таблицы landuse_areas (полная схема; старые версии после чужого ogr2ogr удаляются)…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
DROP TABLE IF EXISTS ${STAGING};
DROP TABLE IF EXISTS landuse_areas CASCADE;
CREATE TABLE landuse_areas (
  raw TEXT,
  landuse TEXT,
  name TEXT,
  risk TEXT,
  region TEXT NOT NULL DEFAULT 'volga',
  geom geometry(MultiPolygon,4326) NOT NULL
);
CREATE INDEX idx_landuse_areas_geom ON landuse_areas USING GIST (geom);
CREATE INDEX idx_landuse_areas_landuse ON landuse_areas (landuse);
CREATE INDEX idx_landuse_areas_risk ON landuse_areas (risk);
SQL

echo "Импорт в staging ${STAGING}: слой multipolygons, OGR -where \"landuse IS NOT NULL AND landuse <> ''\""
# Закрытые кольца: иначе GDAL ругается на часть полигонов OSM
docker run --rm \
  --network "$NET" \
  -e OGR_GEOMETRY_ACCEPT_UNCLOSED_RING=YES \
  -v "$PBF_DIR:/import:ro" \
  ghcr.io/osgeo/gdal:alpine-small-latest \
  ogr2ogr -overwrite \
  -f PostgreSQL "PG:$PG_CONN" "/import/${PBF_BASE}" multipolygons \
  -nln "${STAGING}" \
  -where "landuse IS NOT NULL AND landuse <> ''" \
  "${SPAT_ARGS[@]}" \
  -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom

echo "Перенос в landuse_areas (region=${REGION})…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO landuse_areas (raw, landuse, name, risk, region, geom)
SELECT
  s.landuse AS raw,
  NULL::text,
  NULLIF(BTRIM(COALESCE(s.name, '')), ''),
  NULL::text,
  '${REGION}',
  ST_Multi(s.geom)::geometry(MultiPolygon, 4326)
FROM ${STAGING} AS s
WHERE s.geom IS NOT NULL;

DROP TABLE IF EXISTS ${STAGING};
SQL

echo "Проставляем landuse/risk по ${MAP_JSON}…"
python3 "$EMIT_PY" "$MAP_JSON" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "Готово. Проверка:"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS cnt FROM landuse_areas;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT raw, landuse, risk, region FROM landuse_areas ORDER BY random() LIMIT 8;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FILTER (WHERE landuse = 'Отсутствует') AS unknown_label FROM landuse_areas;"
