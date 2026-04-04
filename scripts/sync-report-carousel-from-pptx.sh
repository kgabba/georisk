#!/usr/bin/env bash
set -euo pipefail
# Регенерация public/report-slide-1.png … 5.png из отчет.pptx (нужны Docker-образы minidocks/libreoffice и minidocks/poppler).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PPTX_NAME="${PPTX_NAME:-отчет.pptx}"
BASE="${PPTX_NAME%.pptx}"
TMP="$ROOT/public/.slide-export-tmp"
mkdir -p "$TMP"

docker run --rm -v "$ROOT:/work" -w /work minidocks/libreoffice:latest \
  soffice --headless --convert-to pdf --outdir "/work/public/.slide-export-tmp" "/work/$PPTX_NAME"

docker run --rm -v "$ROOT/public/.slide-export-tmp:/data" minidocks/poppler:latest \
  pdftoppm -png -r 150 "/data/${BASE}.pdf" /data/report-slide

for i in 1 2 3 4 5; do
  mv -f "$TMP/report-slide-$i.png" "$ROOT/public/report-slide-$i.png"
done

rm -rf "$TMP"

echo "OK: $ROOT/public/report-slide-1.png … report-slide-5.png"
