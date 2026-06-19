# ProxySystem — Internal Residential & Mobile Proxy Manager

A self-hosted proxy management system inspired by BrightData, IpRoyal, and Dataimpulse.

## Architecture

| Layer | Service | Stack |
|---|---|---|
| Gateway | Traefik v3 | Reverse proxy, SSL, rate limiting |
| Admin Panel | AdonisJS v6 + Inertia + Vue 3 | Management UI + API |
| Proxy Engine | Go Fiber | HTTP/HTTPS/SOCKS5 tunneling |
| Scraper | Go Fiber | Multi-source proxy scraping |
| Health Checker | Go Fiber + Playwright | 3-mode proxy checking |
| Database | PostgreSQL 16 | Primary storage |
| Cache/Queue | Redis 7 | Session, pub/sub, Bull queue |
| Message Broker | RabbitMQ 3 | Job distribution |
| Monitoring | Prometheus + Grafana + Loki | Observability |

## Quick Start

### Prerequisites
- Docker + Docker Compose v2
- pnpm v9+
- Go 1.22+

### 1. Clone & Setup

```bash
git clone <repo> proxy-system
cd proxy-system
cp .env.example .env
# Edit .env — fill in passwords & domain
```

### 2. Dev Mode

```bash
# Start all infrastructure (DB, Redis, RabbitMQ, monitoring)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis rabbitmq

# Install Node deps (for AdonisJS)
pnpm install

# Run migrations
pnpm migrate

# Start AdonisJS dev server (hot reload)
pnpm dev

# Start Go services (in separate terminals or use air)
cd apps/proxy-engine && go run ./main.go
cd apps/scraper && go run ./main.go
cd apps/health-checker && go run ./main.go
```

### 3. Full Docker Dev

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### 4. Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Services & Ports (Dev)

| Service | URL |
|---|---|
| AdonisJS App | http://localhost:3333 |
| Proxy Engine | http://localhost:8001 |
| Scraper | http://localhost:8002 |
| Health Checker | http://localhost:8003 |
| RabbitMQ UI | http://localhost:15672 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

## Development Phases

- **Phase 0** ✅ Project foundation (current)
- **Phase 1** — Auth & Dashboard UI
- **Phase 2** — Proxy List & Import System
- **Phase 3** — Health Checker & Scraper Engine
- **Phase 4** — Proxy Engine (tunneling & routing)
- **Phase 5** — Polish, hardening & documentation

## Project Structure

```
proxy-system/
├── apps/
│   ├── web/              # AdonisJS + Inertia + Vue 3
│   ├── proxy-engine/     # Go Fiber — proxy tunneling
│   ├── scraper/          # Go Fiber — multi-source scraper
│   └── health-checker/   # Go Fiber — health checker
├── infra/
│   ├── docker/           # Dockerfiles
│   ├── traefik/          # Traefik config
│   ├── prometheus/       # Prometheus + alert rules
│   ├── grafana/          # Grafana dashboards
│   ├── loki/             # Loki log aggregation
│   ├── promtail/         # Log shipper
│   ├── rabbitmq/         # Queue definitions
│   └── postgres/         # DB init
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .env.example
```
