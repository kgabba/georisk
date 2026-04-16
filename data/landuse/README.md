# Слой землепользования (landuse)

Ожидается shapefile `gis_osm_landuse_a_free_1.shp` вместе с `.dbf/.shx/.prj/.cpg`.

Импорт в PostGIS:

```bash
chmod +x scripts/import_landuse.sh
./scripts/import_landuse.sh ./data/landuse/gis_osm_landuse_a_free_1.shp
```

Таблица назначения: `public.landuse_areas`  
Поля атрибутов: `raw`, `landuse`, `name`, `risk`, `region`  
Геометрия: `geom` (MultiPolygon, SRID 4326)

Маппинг категорий хранится в `scripts/landuse_mapping.json`.
