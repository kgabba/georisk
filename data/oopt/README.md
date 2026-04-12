# Слой ООПТ (shapefile)

1. Распакуйте `oopt.zip` сюда так, чтобы был файл **`OOPT.shp`** (вместе с `.dbf`, `.shx`, `.prj`, при необходимости `.cpg`).
2. Из корня репозитория `georisk` выполните:

```bash
chmod +x scripts/import_oopt.sh
./scripts/import_oopt.sh ./data/oopt/OOPT.shp
```

Или укажите абсолютный путь к `.shp`.

Таблица **`public.oopt_areas`**: `id`, `name_eng` (из поля **NAME_ENG**), `geom` (MultiPolygon, SRID 4326). Создаётся при старте API (`ensureSchema`); импорт делает `TRUNCATE` и заполняет заново.
