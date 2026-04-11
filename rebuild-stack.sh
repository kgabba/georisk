#!/usr/bin/env bash
# Пересборка фронта (web) и API после правок кода. Запускать из каталога georisk, с доступом к Docker.
set -euo pipefail
cd "$(dirname "$0")"
docker compose build web api
docker compose up -d
echo "Готово: web + api. Обновите страницу с полным сбросом кэша (Ctrl+Shift+R)."
