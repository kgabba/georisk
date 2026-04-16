# Бэкапы БД в репозитории

В эту папку можно сохранять «переносимый» дамп Postgres для переезда на новый сервер.

Текущий формат:

- `postgres-core-YYYYMMDD-HHMMSS.dump` — `pg_dump -Fc -Z9`
- включает основные таблицы приложения
- исключает тяжёлые переимпортируемые слои:
  - `public.landuse_areas`
  - `public.oopt_areas`

Восстановление:

```bash
cd georisk
set -a && source .env && set +a
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < backups/postgres-core-YYYYMMDD-HHMMSS.dump
```

После восстановления при необходимости заново загрузите геослои:

- `./scripts/import_oopt.sh ...`
- `./scripts/import_landuse.sh ...`
