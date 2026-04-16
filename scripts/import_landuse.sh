#!/usr/bin/env bash
# Импорт слоя землепользования в PostGIS.
# Таблица назначения: public.landuse_areas
# Поля: raw, landuse, name, risk, region, geom (MultiPolygon, EPSG:4326).

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

SHP_PATH="${1:-$ROOT/data/landuse/gis_osm_landuse_a_free_1.shp}"
if [[ -d "$SHP_PATH" ]]; then
  SHP_PATH="$SHP_PATH/gis_osm_landuse_a_free_1.shp"
fi

if [[ ! -f "$SHP_PATH" ]]; then
  echo "Не найден shapefile: $SHP_PATH" >&2
  echo "Укажите путь к *.shp или положите его в data/landuse/" >&2
  exit 1
fi

SHP_DIR="$(dirname "$SHP_PATH")"
SHP_BASE="$(basename "$SHP_PATH" .shp)"
NET="${COMPOSE_PROJECT_NAME:-georisk}_webnet"
if ! docker network inspect "$NET" &>/dev/null; then
  NET="georisk_webnet"
fi

PG_CONN="host=db port=5432 dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}"

echo "Создание таблицы landuse_areas (полная схема; старый ogr2ogr без landuse/risk пересоздаётся)…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
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

echo "Импорт $SHP_PATH (слой $SHP_BASE) в landuse_areas…"
docker run --rm \
  --network "$NET" \
  -v "$SHP_DIR:/import:ro" \
  ghcr.io/osgeo/gdal:alpine-small-latest \
  ogr2ogr -append -f PostgreSQL "PG:$PG_CONN" "/import/${SHP_BASE}.shp" \
  -nln landuse_areas \
  -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=geom \
  -sql "SELECT fclass AS raw, name AS name, 'volga' AS region FROM ${SHP_BASE}"

echo "Проставляем landuse/risk по словарю…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE landuse_areas
SET
  landuse = CASE
    WHEN raw = 'residential' THEN 'Жилая застройка'
    WHEN raw = 'village_green' THEN 'Сельская территория'
    WHEN raw = 'allotments' THEN 'Садовые участки'
    WHEN raw = 'farmland' THEN 'Сельскохозяйственная земля'
    WHEN raw = 'meadow' THEN 'Луга'
    WHEN raw = 'grass' THEN 'Открытая территория'
    WHEN raw = 'recreation_ground' THEN 'Зона отдыха'
    WHEN raw = 'orchard' THEN 'Садовые посадки'
    WHEN raw = 'vineyard' THEN 'Виноградники'
    WHEN raw = 'brownfield' THEN 'Заброшенная территория'
    WHEN raw = 'greenfield' THEN 'Свободная территория'
    WHEN raw = 'construction' THEN 'Зона строительства'
    WHEN raw = 'garages' THEN 'Гаражная застройка'
    WHEN raw = 'farmyard' THEN 'Фермерское хозяйство'
    WHEN raw = 'industrial' THEN 'Промышленная зона'
    WHEN raw = 'commercial' THEN 'Коммерческая застройка'
    WHEN raw = 'retail' THEN 'Торговая зона'
    WHEN raw = 'railway' THEN 'Железнодорожная инфраструктура'
    WHEN raw = 'port' THEN 'Портовая зона'
    WHEN raw = 'depot' THEN 'Складская база'
    WHEN raw = 'military' THEN 'Военная территория'
    WHEN raw = 'forest' THEN 'Лес'
    WHEN raw = 'cemetery' THEN 'Кладбище'
    WHEN raw = 'landfill' THEN 'Свалка'
    WHEN raw = 'quarry' THEN 'Карьер'
    WHEN raw = 'reservoir' THEN 'Водохранилище'
    ELSE raw
  END,
  risk = CASE
    WHEN raw IN ('residential','village_green','allotments') THEN 'низкий'
    WHEN raw IN ('farmland','meadow','grass','recreation_ground','orchard','vineyard','brownfield','greenfield','construction','garages','farmyard') THEN 'средний'
    WHEN raw IN ('industrial','commercial','retail','railway','port','depot','military','forest','cemetery','landfill','quarry','reservoir') THEN 'высокий'
    ELSE 'средний'
  END;
SQL

echo "Готово. Проверка итогов:"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS cnt FROM landuse_areas;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT raw, landuse, risk, region FROM landuse_areas ORDER BY random() LIMIT 5;"
