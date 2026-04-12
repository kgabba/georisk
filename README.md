# GeoRisk — лендинг + API + PostGIS

Одностраничный маркетинговый сайт (MVP) сервиса проверки георисков участка: кадастровый ввод, запрос к НСПД, карты, блоки «что проверяем», пример отчёта, тарифы, форма заявки. Стек фронта — **Next.js 15 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**. Бэкенд — **Node.js (Fastify)** + **PostgreSQL/PostGIS** в **Docker Compose**, снаружи — **nginx** на порту **80**.

---

## Зачем этот README (контекст без истории чата)

Если репозиторий открыт на **новой машине** или ассистенту нужно быстро войти в контекст:

1. **Продакшен** почти всегда = `docker compose up -d --build`. Пользователь ходит на **`http://<публичный_IP>/`**. Запросы **`/api/*`** nginx проксирует в контейнер **`api`**, остальное — в **`web`** (Next).
2. **Кадастр** не запрашивается из браузера напрямую в НСПД: фронт вызывает **`GET /api/cadastre/:code`**, ответ кэшируется в БД **24 ч**.
3. **Заявки** с формы: **`POST /api/leads`** → таблица **`lead_submissions`**; в БД есть представление **`applications`** (те же строки, удобно смотреть в pgAdmin). Поля: имя, телефон, опционально полигон WKT/geom, кадастр, JSON объекта.
4. Критичные места кода: **[`app/page.tsx`](app/page.tsx)** (состояние кадастра и полигона), **[`backend/src/server.js`](backend/src/server.js)** (НСПД, схема БД, лиды), **[`infra/nginx/default.conf`](infra/nginx/default.conf)** (маршрутизация), **[`.env.example`](.env.example)** (шаблон переменных).
5. **`DOMAIN`** в `.env` — в основном для документации/будущего; фронт по умолчанию бьёт в **относительный** `/api/...`. Важнее **публичный IPv4 ВМ** в облачной консоли и **открытый TCP 80** в security group.

### Домен и nginx (`server_name`)

Раньше в конфиге был **`server_name _;`**: при **одном** `server` на порту **80** это **не ломает** запросы с `Host: geo-risk.ru` — такой блок становится **default server** и обрабатывает все Host, для которых нет более точного совпадения. То есть проблема «сайт не открывается по домену» из‑за **`_`** **не подтверждается**.

Типичная реальная причина — заход на **`https://`** при отсутствии TLS на сервере (в Compose по умолчанию только **:80**). Сейчас в **[`infra/nginx/default.conf`](infra/nginx/default.conf)** явно заданы **`geo-risk.ru`** и **`www.geo-risk.ru`**, **`default_server`** на apex (чтобы **`http://<IP>/`** по‑прежнему открывал сайт), редирект **www → apex** по HTTP и каталог **`/.well-known/acme-challenge/`** для Let’s Encrypt.

---

## HTTPS (Let’s Encrypt, опционально)

1. DNS **A** на IP ВМ для `geo-risk.ru` и при необходимости `www`.
2. Подними стек: `docker compose up -d --build`.
3. Выпусти сертификат (замени email):

```bash
docker compose --profile certbot run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d geo-risk.ru -d www.geo-risk.ru \
  --email you@example.com --agree-tos --no-eff-email
```

4. Открой **TCP 443** в firewall (security group у облака), затем подключи конфиг HTTPS и порт **443** (только если шаг 3 уже создал файлы в `certbot_conf`; иначе nginx упадёт с ошибкой про `fullchain.pem`):

```bash
docker compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
```

Чтобы дальше не указывать два файла вручную, в **`.env`** задай строку **`COMPOSE_FILE=docker-compose.yml:docker-compose.ssl.yml`** (см. **[`.env.example`](.env.example)**) — тогда обычный **`docker compose up -d`** поднимет и **:443**.

5. По желанию переведи HTTP только на редирект: замени монтирование в **`docker-compose.yml`** для nginx с **`default.conf`** на файл **[`infra/nginx/default-http-redirect-to-https.conf`](infra/nginx/default-http-redirect-to-https.conf)** (или скопируй его содержимое в `default.conf` и перезапусти nginx).

Пути к ключам в **[`infra/nginx/https.conf`](infra/nginx/https.conf)** рассчитаны на каталог **`/etc/letsencrypt/live/geo-risk.ru/`** (первый `-d` в certbot). Если выпускал только без `www`, убери лишний `server` для `www` в `https.conf` или добавь домен в certbot.

Продление: раз в несколько дней из cron вызывай **[`scripts/renew-ssl.sh`](scripts/renew-ssl.sh)** (из каталога репозитория на сервере).

---

## Архитектура (кратко)

```mermaid
flowchart LR
  subgraph client [Клиент]
    Browser[Браузер]
  end
  subgraph host [Docker host]
    Nginx[nginx :80 :443]
    Web[web Next :3000]
    Api[api Fastify :3001]
    Db[db PostGIS :5432]
    PgAdmin[pgAdmin :5050]
  end
  subgraph ext [Внешнее]
    NSPD[nspd.gov.ru]
  end
  Browser -->|HTTP| Nginx
  Nginx -->|"/"| Web
  Nginx -->|"/api/"| Api
  Api --> Db
  PgAdmin --> Db
  Api -->|HTTPS JSON| NSPD
```

| Сервис (`docker-compose`) | Образ / сборка | Роль |
|---------------------------|------------------|------|
| **nginx** | `nginx:1.27-alpine` | Порты **80** и (после SSL, см. **[`docker-compose.ssl.yml`](docker-compose.ssl.yml)**) **443**; `location /api/` → **api**; `/` → **web**; кэш для `/_next/static/`; Let’s Encrypt через **`/.well-known/`** и том **`certbot_www`**. |
| **web** | `Dockerfile` (Next) | SSR/статика лендинга. |
| **api** | `backend/Dockerfile` (Node 20) | Fastify: `/health`, `/api/cadastre/:code`, `/api/leads`. Исходящие запросы к НСПД только отсюда. |
| **db** | `postgis/postgis:16-3.4` | Таблицы `lead_submissions`, `cadastre_cache`, **`oopt_areas`** (ООПТ: `name_eng`, `geom` в 4326); представление **`applications`** (= заявки); расширение `postgis`. Импорт shapefile: **[`scripts/import_oopt.sh`](scripts/import_oopt.sh)** и **[`data/oopt/README.md`](data/oopt/README.md)**. |
| **pgadmin** | `dpage/pgadmin4:8.14` | Веб-UI БД: **`http://127.0.0.1:5050`** (только localhost хоста; снаружи — SSH-туннель). Логин/пароль из **`PGADMIN_DEFAULT_*`** в `.env`. |

---

## Переменные окружения

Скопируй **[`.env.example`](.env.example)** → **`.env`** (файл `.env` в git не коммитится).

| Переменная | Обязательно | Смысл |
|------------|-------------|--------|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | да для Compose | Учётка БД для `db` и `api`. |
| `NEXT_PUBLIC_API_BASE_URL` | нет | Обычно **пусто**: браузер дергает тот же хост `/api/...` через nginx. |
| `NEXT_PUBLIC_UMAMI_*` | нет | Аналитика Umami Cloud. |
| `NSPD_TLS_INSECURE` | нет | `true` — если TLS к НСПД падает (корпоративный MITM, цепочка сертификатов). Только для исходящего запроса в коде API. |
| `NODE_EXTRA_CA_CERTS` | нет | Путь к PEM доверенных CA **внутри контейнера** api (предпочтительнее, чем отключать TLS). |
| `NSPD_HTTPS_PROXY` / `NSPD_HTTP_PROXY` | нет | HTTP(S)-прокси **только** для запросов к `nspd.gov.ru` (например второй VPS с «бытовым» IP), если датацентр режут по IP. |
| `DOMAIN` | нет | Подсказка своего домена/IP для доков; на маршрутизацию nginx не влияет. |
| `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` | нет (есть дефолты в Compose) | Учётка входа в pgAdmin; в проде задайте свои значения. |

---

## pgAdmin

После `docker compose up -d --build` открой **`http://127.0.0.1:5050`**, войди email/пароль из `.env`. Зарегистрируй сервер: **Host** `db`, **Port** `5432`, **Maintenance database** = `POSTGRES_DB`, **Username** / **Password** = те же, что для Postgres (`POSTGRES_*`).

Схема **public**: таблица **`lead_submissions`**, view **`applications`**, кэш **`cadastre_cache`**, слой **`oopt_areas`**.

---

## НСПД и кадастр (backend)

Файл: **[`backend/src/server.js`](backend/src/server.js)**.

- **URL:** `GET https://nspd.gov.ru/api/geoportal/v2/search/geoportal?thematicSearchId=1&query=<код>&CRS=EPSG:4326` (как у публичной карты).
- **Заголовки:** к запросу к НСПД добавлены **браузероподобные** `User-Agent`, `Referer`, `Accept-Language` (`NSPD_GEOSEARCH_HEADERS`). Без них НСПД часто отвечает **403**, хотя с того же IP **Python** (`nspd-request`) или **curl** с заголовками могут работать — это **не обязательно** «блокировка IP», а WAF/антибот.
- **TLS:** при ошибках сертификата API отдаёт **503** с кодом `NSPD_TLS` — см. `NSPD_TLS_INSECURE` / `NODE_EXTRA_CA_CERTS` в `.env`.
- **Кэш:** успешный ответ пишется в **`cadastre_cache`** на **24 часа** (`expires_at`).
- **Старт API:** перед миграциями схемы вызывается **`waitForPoolReady()`** — несколько попыток `SELECT 1`, чтобы не падать с `ECONNREFUSED` при первом `compose up` (гонка с `depends_on: healthy` у Postgres).

Ошибки API для фронта (кадастр): **`NSPD_BLOCKED`** (403/401/429 от НСПД), **`NSPD_TLS`**, общий апстрим **502**.

---

## Docker Compose: запуск и типичные проблемы

```bash
cp .env.example .env   # заполнить POSTGRES_*
docker compose up -d --build
docker compose ps
```

Проверки:

```bash
curl -sS "http://127.0.0.1/api/cadastre/38:06:144003:4723" | head
curl -I http://127.0.0.1/
docker compose logs -f api
```

| Симптом | Что проверить |
|---------|----------------|
| `permission denied` на `docker.sock` | `sudo usermod -aG docker $USER`, затем **новый SSH-сеанс** или `newgrp docker`. |
| Сайт не открывается извне | В консоли облака: **правильный публичный IPv4** именно этой ВМ (`curl -4 ifconfig.me` **с ВМ**), **security group**: входящий **TCP 80**. У `nginx` в `docker compose ps` должно быть `0.0.0.0:80->80/tcp`. |
| Лендинг есть, кадастр **502/503** | Логи `api`; НСПД: заголовки (см. выше), TLS, прокси. |
| `npm run dev` локально без Docker | Фронт дергает **`/api/cadastre/...`** на том же origin — **маршрута Next нет**, ответа не будет, пока не поднят полный стек или не настроен reverse-proxy/rewrite на порт API. Для полной проверки кадастра/лидов используй **Compose** или проксируй `/api` на `localhost:3001`. |

Заявки в БД:

```bash
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, name, phone, created_at FROM applications ORDER BY id DESC LIMIT 10;"
```

Кэш кадастра:

```bash
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT code, expires_at FROM cadastre_cache ORDER BY created_at DESC LIMIT 10;"
```

---

## Требования

- **Node.js 18.18+** (рекомендуется **20 LTS**) для локальной сборки фронта и для образа API.
- **npm**.
- **Docker + Docker Compose plugin** для деплоя как в репозитории.

---

## Локальная разработка (только Next)

```bash
npm install
npm run dev
```

Сборка и прод без контейнера:

```bash
npm run build
npm run start
```

Линт: `npm run lint`.

---

## Структура репозитория

| Путь | Назначение |
|------|------------|
| [`app/layout.tsx`](app/layout.tsx) | Корневой layout, метаданные, `globals.css`. |
| [`app/page.tsx`](app/page.tsx) | Главная: `polygonCoords`, `cadastreData`, `handleCadastreCaptured` → `fetch('/api/cadastre/...')`, передача feature/summary в карты и **LeadForm**. |
| [`app/globals.css`](app/globals.css) | Глобальные стили, Tailwind. |
| [`components/`](components/) | UI: Hero, карты, форма, модалка контактов, тарифы и т.д. |
| [`lib/contact.ts`](lib/contact.ts) | Телефон и Telegram для шапки и модалки. |
| [`lib/cadastre.ts`](lib/cadastre.ts) | Типы ответа `GET /api/cadastre/:code` для фронта. |
| [`public/`](public/) | Статика, слайды отчёта `report-slide-*.png`. |
| [`scripts/sync-report-carousel-from-pptx.sh`](scripts/sync-report-carousel-from-pptx.sh) | Опционально: PPTX → PNG в `public/`. |
| [`tailwind.config.ts`](tailwind.config.ts) | Тема (`mint`, `geoblue`, …). |
| [`next.config.mjs`](next.config.mjs) | Конфиг Next (`reactStrictMode`). |
| [`Dockerfile`](Dockerfile) | Сборка образа **web**. |
| [`docker-compose.yml`](docker-compose.yml) | **web**, **api**, **db**, **nginx**. |
| [`infra/nginx/default.conf`](infra/nginx/default.conf) | Прокси на **web:3000** и **api:3001**. |
| [`backend/`](backend/) | Fastify API, `src/server.js`. |
| [`.env.example`](.env.example) | Шаблон переменных. |

---

## Как устроена главная страница

Страница **`"use client"`**: карты Leaflet, модалка, формы на клиенте.

### Модалка контактов

[`ContactAdminModalProvider`](components/ContactAdminModal.tsx) — хук `useContactAdminModal()`, `openContactModal()`.

### Состояние

В [`app/page.tsx`](app/page.tsx):

- **`polygonCoords`** — с [`MapSection`](components/MapSection.tsx) / [`MobileMapSection`](components/MobileMapSection.tsx).
- **`cadastreData`** — после ввода кадастра в **Hero** и успешного **`GET /api/cadastre/:code`**; передаётся в карты (**подсветка объекта**, панель сводки) и в [**LeadForm**](components/LeadForm.tsx) (`cadastreNumber`, `cadastreFeature`, `polygonCoords` уходят в **`POST /api/leads`**).

### Порядок секций и карты

Секции в `main` с **`order`** для адаптива. Поток: **Hero** → **MapSection** (десктоп, `md+`, Leaflet + leaflet-draw) → **SolutionsMistakesSection** → **MobileMapSection** (≤768px, Leaflet + leaflet-geoman-free) → **WhatWeCheck** → **ReportExample** → **EndSemrushPanel** (**LeadForm** + **Pricing**) → **Footer**.

**Navbar:** [`components/Navbar.tsx`](components/Navbar.tsx) — контакты из [`lib/contact.ts`](lib/contact.ts).

---

## Контент и ассеты

- Контакты: **[`lib/contact.ts`](lib/contact.ts)**.
- Логотип: **`/logo-mark.png`**.
- Карусель отчёта: **`/report-slide-1.png` … `5.png`**; пересборка из **`отчет.pptx`**: `npm run sync-report-slides` (см. скрипт в `scripts/`).

---

## Деплой (облако / VPS)

Установка Docker (пример для Ubuntu) — см. официальную документацию Docker CE + **compose plugin**.

На сервере:

```bash
cp .env.example .env
# задать POSTGRES_*; при необходимости NSPD_* и Umami
docker compose up -d --build
```

Проверка кадастра снаружи:

```bash
curl "http://<SERVER_IP>/api/cadastre/38:06:144003:4723"
```

**HTTPS:** в compose nginx слушает **80**. TLS — на балансировщике, **certbot** на хосте с прокси на 80, или отдельный конфиг **443** в nginx.

---

## Скрипты npm

| Скрипт | Действие |
|--------|----------|
| `dev` | Dev-сервер Next |
| `build` | Продакшен-сборка |
| `start` | Запуск после `build` |
| `lint` | ESLint |
| `sync-report-slides` | PPTX → PNG в `public/` |

---

## Подготовка к будущей гео-логике

Backend уже пишет заявки в PostGIS; можно добавлять spatial-слои, `ST_Intersects`, генерацию отчётов, отдельные сервисы.
