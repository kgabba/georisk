#!/usr/bin/env bash
# Продление Let's Encrypt и перезагрузка nginx (cron: раз в день/неделю).
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose --profile certbot run --rm certbot renew --webroot -w /var/www/certbot
docker compose exec nginx nginx -s reload
