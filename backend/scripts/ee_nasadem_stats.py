#!/usr/bin/env python3
"""
Читает JSON из stdin: {"ring": [[lon, lat], ...]} — замкнутый или незамкнутый контур участка в WGS84.
Пишет в stdout один JSON: {"maxSlopeDeg": float|null, "elevationM": float|null}
или {"error": "..."} и код выхода != 0.

Аутентификация: сервисный аккаунт Google Cloud (не Colab).
  GOOGLE_APPLICATION_CREDENTIALS — путь к JSON ключу
  GEE_PROJECT_ID — ID GCP-проекта, зарегистрированного в Earth Engine
"""
from __future__ import annotations

import json
import os
import sys


def main() -> None:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as e:
        _out({"error": f"invalid json stdin: {e}"}, 1)
        return

    ring = data.get("ring")
    if not isinstance(ring, list) or len(ring) < 3:
        _out({"error": "ring must be array of at least 3 [lon, lat] pairs"}, 1)
        return

    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    project = os.environ.get("GEE_PROJECT_ID", "").strip()
    if not key_path or not os.path.isfile(key_path):
        _out({"error": "GOOGLE_APPLICATION_CREDENTIALS must point to a readable service-account JSON file"}, 1)
        return
    if not project:
        _out({"error": "GEE_PROJECT_ID is required"}, 1)
        return

    # Замкнуть кольцо для EE.Polygon
    coords: list[list[float]] = []
    for p in ring:
        if not isinstance(p, (list, tuple)) or len(p) < 2:
            _out({"error": "each ring point must be [lon, lat]"}, 1)
            return
        coords.append([float(p[0]), float(p[1])])
    if coords[0][0] != coords[-1][0] or coords[0][1] != coords[-1][1]:
        coords.append(coords[0][:])

    import ee  # noqa: PLC0415 — после проверки окружения

    with open(key_path, encoding="utf-8") as f:
        sa = json.load(f)
    email = sa.get("client_email")
    if not email:
        _out({"error": "service account JSON missing client_email"}, 1)
        return

    credentials = ee.ServiceAccountCredentials(email, key_path)
    ee.Initialize(credentials=credentials, project=project)

    polygon = ee.Geometry.Polygon([coords])
    dem = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
    # Явное имя полосы — ключи reduceRegion совпадают с именем полосы
    slope = ee.Terrain.slope(dem).rename("slope").clip(polygon).updateMask(
        dem.clip(polygon).mask()
    )

    max_slope_img = slope.reduceRegion(
        reducer=ee.Reducer.max(),
        geometry=polygon,
        scale=30,
        maxPixels=1e9,
        bestEffort=True,
        tileScale=4,
    )
    centroid = polygon.centroid(maxError=1)
    # reduceRegion на Point почти не сэмплирует пиксели — буфер ~половина пикселя NASADEM (30 м)
    centroid_sample = centroid.buffer(20)
    elev_img = dem.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=centroid_sample,
        scale=30,
        maxPixels=1e6,
        bestEffort=True,
        tileScale=2,
    )

    max_info = max_slope_img.getInfo()
    elev_info = elev_img.getInfo()

    def pick_num(d: dict, *keys: str) -> float | None:
        for k in keys:
            if k in d and d[k] is not None:
                try:
                    v = float(d[k])
                    if v == v:  # not NaN
                        return v
                except (TypeError, ValueError):
                    continue
        # Любое одно числовое поле (на случай другого имени полосы / версии EE)
        for _k, v in (d or {}).items():
            if v is None:
                continue
            try:
                fv = float(v)
                if fv == fv:
                    return fv
            except (TypeError, ValueError):
                continue
        return None

    max_slope = pick_num(max_info or {}, "slope")
    elevation = pick_num(elev_info or {}, "elevation")

    if max_slope is None or elevation is None:
        print(
            json.dumps(
                {"ee_nasadem_debug": {"max_info": max_info, "elev_info": elev_info}},
                ensure_ascii=False,
            ),
            file=sys.stderr,
            flush=True,
        )

    _out({"maxSlopeDeg": max_slope, "elevationM": elevation}, 0)


def _out(obj: dict, code: int) -> None:
    print(json.dumps(obj, ensure_ascii=False), flush=True)
    raise SystemExit(code)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"error": str(e)}, ensure_ascii=False), flush=True)
        sys.exit(1)
