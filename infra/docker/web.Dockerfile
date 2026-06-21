# ============================================================
# AdonisJS web (Inertia + Vue) — build context = repo root
# ============================================================
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- install all deps (incl dev, needed for the Vite/Adonis build) ----
FROM base AS deps
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- compile TypeScript + build Vite assets -> /app/build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./
# `node ace build` boots the app (entity-index hooks) which validates env, so
# provide throwaway build-time values. Real values are injected at runtime.
ENV NODE_ENV=production \
    APP_KEY=build_only_dummy_key_0123456789abcdef \
    HOST=0.0.0.0 PORT=3333 LOG_LEVEL=info SESSION_DRIVER=cookie \
    DB_CONNECTION=pg DB_HOST=localhost DB_PORT=5432 DB_USER=build DB_DATABASE=build \
    REDIS_HOST=localhost REDIS_PORT=6379
RUN node ace build

# ---- production runtime ----
FROM base AS production
ENV NODE_ENV=production
RUN apk add --no-cache wget
# `node ace build` emits a self-contained app in ./build (incl package.json + lockfile)
COPY --from=build /app/build ./
RUN pnpm install --prod --frozen-lockfile
COPY infra/docker/web-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3333
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
