# GeoRisk — лендинг

Одностраничный маркетинговый сайт (MVP) сервиса проверки георисков участка: кадастровый ввод, карты, блоки «что проверяем», пример отчёта, тарифы, форма заявки. Стек — **Next.js 15 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**. Визуально — светлая «лендинговая» подача в духе SaaS.

---

## Требования

- **Node.js 18.18+** (рекомендуется 20 LTS). Next 15 и часть зависимостей не поддерживают старые версии Node.
- npm (или совместимый менеджер пакетов).
- Для серверного деплоя: Docker + Docker Compose plugin.

---

## Запуск

```bash
npm install
npm run dev
```

Сборка и прод-режим:

```bash
npm run build
npm run start
```

Линт:

```bash
npm run lint
```

---

## Структура репозитория

| Путь | Назначение |
|------|------------|
| [`app/layout.tsx`](app/layout.tsx) | Корневой layout: шрифт Inter (латиница + кириллица), метаданные страницы, `globals.css`. |
| [`app/page.tsx`](app/page.tsx) | Единственная страница лендинга: порядок секций, общий state полигона, обёртка `ContactAdminModalProvider`. |
| [`app/globals.css`](app/globals.css) | Глобальные стили и слой Tailwind. |
| [`components/`](components/) | Все UI-блоки лендинга (см. ниже). |
| [`lib/contact.ts`](lib/contact.ts) | **Единственный источник** телефона и ссылки Telegram для шапки, модалки и кнопок. |
| [`public/`](public/) | Статика: логотип, слайды карусели отчёта, иллюстрации секций (`report-page-*.png` и т.д.). |
| [`scripts/sync-report-carousel-from-pptx.sh`](scripts/sync-report-carousel-from-pptx.sh) | Опционально: выгрузка PNG слайдов из `отчет.pptx` в `public/report-slide-*.png` (через Docker). |
| [`tailwind.config.ts`](tailwind.config.ts) | Тема: цвета `mint`, `geoblue`, тень `soft`, шрифт. |
| [`next.config.mjs`](next.config.mjs) | Минимальная конфигурация Next (`reactStrictMode`). |
| [`Dockerfile`](Dockerfile) | Multi-stage сборка production-образа Next.js. |
| [`docker-compose.yml`](docker-compose.yml) | Запуск `web` (Next.js) + `api` (backend) + `db` (PostGIS) + `nginx` (reverse proxy). |
| [`infra/nginx/default.conf`](infra/nginx/default.conf) | Конфигурация nginx с проксированием в `web:3000`, логами и cache для `/_next/static`. |
| [`.env.example`](.env.example) | Шаблон переменных окружения (Umami и будущий API URL). |
| [`backend/`](backend/) | Минимальный backend-сервис для записи заявок в PostGIS (`POST /api/leads`). |

Заявка формы отправляется в backend endpoint `POST /api/leads` и сохраняется в таблицу `lead_submissions` в PostGIS.  
Поиск по кадастровому номеру выполняется через `GET /api/cadastre/:code` с кэшем в `cadastre_cache` (24 часа).

---

## Как устроена главная страница

Страница помечена `"use client"`: интерактив (карты Leaflet, модалка, формы) целиком на клиенте.

### Провайдер модалки контактов

[`ContactAdminModalProvider`](components/ContactAdminModal.tsx) оборачивает контент и даёт хук `useContactAdminModal()` с методом `openContactModal()`. Открывается диалог «Бесплатная пробная проверка» с телефоном и кнопкой в Telegram. Оверлей с высоким `z-index`, чтобы быть поверх карт Leaflet/Geoman.

### Состояние полигона

В [`app/page.tsx`](app/page.tsx) хранится `polygonCoords: [number, number][] | null`. Его обновляют:

- десктопная карта ([`MapSection`](components/MapSection.tsx) + [`LeafletMap`](components/LeafletMap.tsx));
- мобильная секция ([`MobileMapSection`](components/MobileMapSection.tsx)).

Значение передаётся в [`LeadForm`](components/LeadForm.tsx) как проп `polygonCoords` (на будущее, если понадобится прикреплять контур к заявке; сейчас отправки на сервер нет).

### Порядок секций и адаптив

Секции в `main` используют **CSS `order`**, чтобы на мобильных и десктопе блоки шли в нужном порядке без дублирования разметки. Якоря (`id`) нужны для меню и прокрутки.

Типичный поток (упрощённо):

1. **Hero** — заголовок, поле кадастрового номера, CTA «Проверить». Пустой ввод или заполненный: открывается модалка контактов; при непустом номере дополнительно вызывается `onCadastreCaptured` (сейчас в `page` передаётся пустая функция-заглушка).
2. **MapSection** — карта только **от `md` и выше** (`hidden` на мобиле, `md:block`). Leaflet + **leaflet-draw**: рисование полигона, правка, OSM.
3. **SolutionsMistakesSection** — «частые ошибки», аккордеоны, превью страниц отчёта.
4. **MobileMapSection** — рендерится **только при ширине viewport ≤ 768px** (`matchMedia` + `return null` на десктопе). Внутри динамический импорт без SSR карты с **Leaflet + leaflet-geoman-free** (рисование/редактирование/удаление полигона), стартовый экстент «Ленинградская — Курганская область», тайлы OSM, кнопка «Проверить» → модалка и при наличии полигона — `onPolygonReady`.
5. **WhatWeCheck**, **ReportExample** (карусель отчёта + лайтбокс).
6. **EndSemrushPanel** — обёртка с `order`, внутри **LeadForm** и **Pricing** (`mode="panel"`).
7. **Footer**.

### Навигация

[`Navbar`](components/Navbar.tsx):

- **Десктоп (`md+`)**: логотип, телефон, кнопка Telegram (данные из [`lib/contact.ts`](lib/contact.ts)).
- **Мобилка**: иконка-меню, пункт «Контакты» (модалка), якорные ссылки из массива `MOBILE_NAV` (в т.ч. «Выделить на карте» → `#mobile-map-section`).

На узких экранах у шапки повышенный `z-index`, чтобы выпадающее меню не уходило под карту.

### Карты: два варианта

| Где | Компонент | Библиотека | Когда видна |
|-----|-----------|------------|-------------|
| Десктоп | `LeafletMap` | `leaflet`, `leaflet-draw` | `md` и шире, внутри `MapSection` |
| Мобилка | `MobileMapGeomanInner` | `leaflet`, `@geoman-io/leaflet-geoman-free` | только ≤768px, через `dynamic(..., { ssr: false })` |

Обе тянут тайлы **OpenStreetMap**. Инициализация карт в `useEffect`, чтобы не ломать SSR.

### Остальные компоненты (кратко)

- **Pricing** — тарифы; тексты и цены внутри компонента.
- **ReportCarousel** — слайды из `public/report-slide-1.png` … `5.png`, анимации Framer Motion, лайтбокс.
- **LeadForm** — react-hook-form + zod; сабмит в backend (`/api/leads`) с сохранением кадастровых данных.
- **Footer** — нижняя полоса сайта.

---

## Контент и ассеты

- Телефон и Telegram правятся в **[`lib/contact.ts`](lib/contact.ts)**.
- Логотип в шапке: **`/logo-mark.png`**.
- Карусель «пример отчёта»: **`/report-slide-1.png` … `report-slide-5.png`**. Их можно пересобрать из корневого **`отчет.pptx`**:

  ```bash
  npm run sync-report-slides
  ```

  Скрипт использует Docker-образы LibreOffice и poppler (см. комментарии в [`scripts/sync-report-carousel-from-pptx.sh`](scripts/sync-report-carousel-from-pptx.sh)).

---

## Деплой

### Рекомендуемая схема для Selectel

- `web` контейнер: Next.js (`npm run build` + `npm run start`).
- `api` контейнер: Fastify backend (`POST /api/leads`).
- `db` контейнер: PostgreSQL + PostGIS (хранение заявок, база для будущих spatial-операций).
- `nginx` контейнер: reverse proxy на 80 порт.
- Аналитика посещений: **Umami Cloud** (подключается через env).

### 1) Подготовка сервера

Установить Docker и Compose plugin (Ubuntu):

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2) Конфигурация проекта на сервере

```bash
cp .env.example .env
```

Заполнить в `.env`:

- `NEXT_PUBLIC_UMAMI_SCRIPT_URL` (обычно `https://cloud.umami.is/script.js`);
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (id сайта из Umami);
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (для контейнера PostGIS);
- `NEXT_PUBLIC_API_BASE_URL` можно оставить пустым (запросы идут через `/api`).

### 3) Запуск

```bash
docker compose up -d --build
docker compose ps
```

После старта можно проверить endpoint кадастра:

```bash
curl "http://<SERVER_IP>/api/cadastre/38:06:144003:4723"
```

Проверка:

```bash
curl -I http://<SERVER_IP>
docker compose logs -f web
docker compose logs -f api
docker compose logs -f db
docker compose logs -f nginx
```

Проверка записи заявок в БД:

```bash
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id, name, phone, created_at FROM lead_submissions ORDER BY id DESC LIMIT 10;"
```

Проверка кэша кадастровых ответов:

```bash
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT code, expires_at, created_at FROM cadastre_cache ORDER BY created_at DESC LIMIT 10;"
```

### 4) TLS/HTTPS

В текущем compose `nginx` слушает только `80` порт. Для production HTTPS добавьте TLS одним из вариантов:

- через внешний TLS (например, балансировщик/edge в Selectel);
- или отдельным шагом выпустить сертификат Let's Encrypt и подключить `443` в конфиг nginx.

### Подготовка к будущей гео-логике

Сейчас backend уже отделен от фронта и пишет заявки в PostGIS. Это позволяет постепенно добавлять:

1. spatial-таблицы (`ООПТ`, `ЛЭП`, подтопления и т.д.);
2. GiST-индексы и запросы `ST_Intersects`, `ST_Within`, `ST_Distance`;
3. сервис автоматической генерации отчета;
4. отдельный RAG/LLM модуль как независимый сервис.

---

## Скрипты npm

| Скрипт | Действие |
|--------|----------|
| `dev` | Dev-сервер Next |
| `build` | Продакшен-сборка |
| `start` | Запуск после `build` |
| `lint` | ESLint (конфиг Next) |
| `sync-report-slides` | Экспорт слайдов PPTX → PNG в `public/` |
