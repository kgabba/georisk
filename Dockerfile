FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app

# Имена GEORISK_* — чтобы пустые NEXT_PUBLIC_* в shell IDE не затирали .env при docker compose build.
ARG GEORISK_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
ARG GEORISK_UMAMI_WEBSITE_ID
ARG GEORISK_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_UMAMI_SCRIPT_URL=$GEORISK_UMAMI_SCRIPT_URL
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$GEORISK_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_API_BASE_URL=$GEORISK_PUBLIC_SITE_URL

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "run", "start"]
