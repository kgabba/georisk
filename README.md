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
| [`docker-compose.yml`](docker-compose.yml) | Запуск `web` (Next.js) + `nginx` (reverse proxy). |
| [`infra/nginx/default.conf`](infra/nginx/default.conf) | Конфигурация nginx с проксированием в `web:3000`, логами и cache для `/_next/static`. |
| [`.env.example`](.env.example) | Шаблон переменных окружения (Umami и будущий API URL). |

**API-маршрутов в `app/api` сейчас нет** — лендинг не шлёт данные на собственный backend; форма заявки по сабмиту показывает `alert` (заглушка).

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
- **LeadForm** — react-hook-form + zod; сабмит без API, только `alert`.
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

### Что разворачивается сейчас

В репозитории только Next.js лендинг. Отдельный backend не поднимается.

### Рекомендуемая схема для Selectel

- `web` контейнер: Next.js (`npm run build` + `npm run start`).
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
- `NEXT_PUBLIC_API_BASE_URL` пока можно оставить пустым.

### 3) Запуск

```bash
docker compose up -d --build
docker compose ps
```

Проверка:

```bash
curl -I http://<SERVER_IP>
docker compose logs -f web
docker compose logs -f nginx
```

### 4) TLS/HTTPS

В текущем compose `nginx` слушает только `80` порт. Для production HTTPS добавьте TLS одним из вариантов:

- через внешний TLS (например, балансировщик/edge в Selectel);
- или отдельным шагом выпустить сертификат Let's Encrypt и подключить `443` в конфиг nginx.

### Подготовка к будущему backend

В `infra/nginx/default.conf` уже есть блок `location /api/`. Пока он проксирует в `web`.
Когда появится backend, достаточно:

1. добавить сервис `api` в `docker-compose.yml`;
2. сменить `proxy_pass` для `/api` на `http://api:<port>`;
3. перезапустить `docker compose up -d`.

Домен и фронт при этом менять не нужно.

---

## Скрипты npm

| Скрипт | Действие |
|--------|----------|
| `dev` | Dev-сервер Next |
| `build` | Продакшен-сборка |
| `start` | Запуск после `build` |
| `lint` | ESLint (конфиг Next) |
| `sync-report-slides` | Экспорт слайдов PPTX → PNG в `public/` |
