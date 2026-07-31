# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/data/app.db"
ENV UPLOAD_DIR="/app/data/uploads"
ENV PDF_MAX_SIZE_MB=20
ENV PDF_PARSE_TIMEOUT_MS=300000
ENV USER_STORAGE_QUOTA_MB=1024
ENV ALLOW_REGISTRATION=false
ENV PORT=3000

FROM base AS dependencies

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/migrate-production.mjs ./scripts/migrate-production.mjs
RUN npm ci --no-audit

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/migrate-production.mjs ./scripts/migrate-production.mjs
RUN npm ci --omit=dev --no-audit && npm cache clean --force

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts

RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

# Baseline databases created by older releases, apply versioned migrations,
# then start the production server.
CMD ["sh", "-c", "node scripts/migrate-production.mjs && npm start"]
