#!/usr/bin/env bash
# Строит таблицу water_save: буферы полигонов из water_objects (метры через geography).
# Ширина буфера: 200 м для water IN (river, oxbow, reservoir, basin, canal), иначе 50 м.
# Атрибуты: water, name (как в water_objects).

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

echo "Создание water_save из water_objects (буферы 200/50 м)…"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
DROP TABLE IF EXISTS water_save CASCADE;

CREATE TABLE water_save (
  id BIGSERIAL PRIMARY KEY,
  water TEXT,
  name TEXT,
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX idx_water_save_geom ON water_save USING GIST (geom);
CREATE INDEX idx_water_save_water ON water_save (water);

INSERT INTO water_save (water, name, geom)
SELECT
  w.water,
  w.name,
  ST_Multi(
    ST_MakeValid(
      (ST_Buffer(
        w.geom::geography,
        CASE
          WHEN w.water IN ('river', 'oxbow', 'reservoir', 'basin', 'canal') THEN 200
          ELSE 50
        END
      ))::geometry
    )
  )::geometry(MultiPolygon, 4326)
FROM water_objects AS w
WHERE w.geom IS NOT NULL;

ANALYZE water_save;
SQL

echo "Готово."
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) AS cnt FROM water_save;"
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT water, COUNT(*) FROM water_save GROUP BY 1 ORDER BY 2 DESC LIMIT 10;"
