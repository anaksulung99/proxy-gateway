# ============================================================
# Dockerfile — AdonisJS Web App (Inertia + Vue)
# Multi-stage: development (hot reload) & production (optimized)
# ============================================================

# ── Base stage
FROM node:24-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    dumb-init

# ── Dependencies stage
FROM base AS deps
COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ── Development stage (hot reload via nodemon/ts-node-dev)
FROM base AS development
WORKDIR /app

# Copy node_modules dari deps
COPY --from=deps /app/node_modules ./node_modules

# Non-root user untuk security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S adonisjs -u 1001 -G nodejs

USER adonisjs

EXPOSE 3333
# Metrics port untuk Prometheus
EXPOSE 9100

# Development: source code di-mount via volume, jalankan dev server
CMD ["dumb-init", "node", "ace", "serve", "--hmr"]

# ── Build stage — compile TypeScript & build Vite assets
FROM deps AS builder
WORKDIR /app

COPY apps/web/ .

# Build frontend assets (Vite)
RUN pnpm run build

# Compile AdonisJS (TypeScript → JavaScript)
RUN node ace build

# ── Production stage
FROM node:24-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl wget dumb-init

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S adonisjs -u 1001 -G nodejs

# Copy compiled output dari builder
COPY --from=builder --chown=adonisjs:nodejs /app/build ./
COPY --from=builder --chown=adonisjs:nodejs /app/node_modules ./node_modules

USER adonisjs

EXPOSE 3333
EXPOSE 9100

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

CMD ["dumb-init", "node", "bin/server.js"]
