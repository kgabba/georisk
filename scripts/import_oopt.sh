#!/usr/bin/env bash
# Импорт слоя ООПТ (shapefile) в PostGIS, таблица public.oopt_areas (name_eng, geom в EPSG:4326).
# Требуется: Docker, compose-проект georisk с сервисом db; образ GDAL (скачивается при первом запуске).
#
# Использование:
#   ./scripts/import_oopt.sh /path/to/OOPT.shp
#   ./scripts/import_oopt.sh /path/to/dir_with_shape   # ожидается OOPT.shp внутри (регистр: OOPT.shp)
#
# Перед запуском распакуйте корректный oopt.zip (в среде разработки архив должен быть целым).

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

SHP_PATH="${1:-$ROOT/data/oopt/OOPT.shp}"
if [[ -d "$SHP_PATH" ]]; then
  SHP_PATH="$SHP_PATH/OOPT.shp"
fi

if [[ ! -f "$SHP_PATH" ]]; then
  echo "Не найден shapefile: $SHP_PATH" >&2
  echo "Укажите путь к OOPT.shp или положите файлы в data/oopt/" >&2
  exit 1
fi

SHP_DIR="$(dirname "$SHP_PATH")"
SHP_BASE="$(basename "$SHP_PATH" .shp)"
NET="${COMPOSE_PROJECT_NAME:-georisk}_webnet"
if ! docker network inspect "$NET" &>/dev/null; then
  NET="georisk_webnet"
fi

PG_CONN="host=db port=5432 dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}"

echo "Очистка таблицы oopt_areas…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "TRUNCATE oopt_areas RESTART IDENTITY;"

echo "Импорт $SHP_PATH (слой $SHP_BASE) через ogr2ogr → WGS84 / MultiPolygon…"
docker run --rm \
  --network "$NET" \
  -v "$SHP_DIR:/import:ro" \
  ghcr.io/osgeo/gdal:alpine-small-latest \
  ogr2ogr -append -f PostgreSQL "PG:$PG_CONN" "/import/${SHP_BASE}.shp" \
  -nln oopt_areas \
  -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI \
  -sql "SELECT NAME_ENG AS name_eng FROM ${SHP_BASE}" \
  -lco GEOMETRY_NAME=geom \
  -lco FID=id

echo "Готово. Строк в oopt_areas:"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS cnt FROM oopt_areas;"
