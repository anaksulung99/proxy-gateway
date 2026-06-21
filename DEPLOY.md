# Deployment (Docker Compose)

Self-contained stack: **web** (AdonisJS) · **proxy-engine** (HTTP+SOCKS5 gateway) ·
**scraper** · **health-checker** + **postgres / redis / rabbitmq**, with optional
**monitoring** (Prometheus/Grafana/Loki) and **edge** (Traefik/TLS) profiles.

## 1. Prerequisites
- Docker Engine + Docker Compose v2 (`docker compose version`).

## 2. Ports — datastores
Apps reach the datastores **inside** the docker network by hostname on their default
internal ports (`postgres:5432`, `redis:6379`, `rabbitmq:5672`). They are also
**published to the host on `127.0.0.1` only** (reach them via SSH tunnel — see §6),
never the public internet:

| Service   | Internal | Host publish (127.0.0.1) | Note |
|-----------|----------|--------------------------|------|
| Postgres  | 5432     | **5432** (`POSTGRES_HOST_PORT`) | default; no native postgres on this host |
| Redis     | 6379     | **6379** (`REDIS_HOST_PORT`)    | default; no native redis on this host |
| RabbitMQ  | 5672 / 15672 | **5673 / 15673** (`RABBITMQ_HOST_PORT`, `RABBITMQ_MGMT_HOST_PORT`) | shifted because a **native rabbitmq** still runs on 5672/15672 |

Proxy/app ports published to the host:

| What                  | Port |
|-----------------------|------|
| Web UI                | 3333 (`WEB_HOST_PORT`) |
| HTTP forward proxy    | 8000 (`GATEWAY_HOST_PORT`) |
| SOCKS5 proxy          | 1080 (`SOCKS_HOST_PORT`) |

## 3. Configure
```bash
cp .env.example .env
# edit .env: set strong DB_PASSWORD / REDIS_PASSWORD / RABBITMQ_PASSWORD,
# GATEWAY_SECRET, INTERNAL_API_SECRET, and GATEWAY_HOST / GATEWAY_SOCKS_HOST
# to your server's public host:port.

# Generate the AdonisJS APP_KEY (required) and paste it into .env:
docker compose run --rm web node ace generate:key
```

## 4. Build & run
```bash
docker compose up -d --build              # core stack (db + 4 services)
docker compose --profile monitoring up -d # + Prometheus :9090 / Grafana :3000 / Loki
docker compose --profile edge up -d       # + Traefik (TLS via Let's Encrypt, set DOMAIN)
```
The **web** container runs DB migrations automatically on start (`migration:run --force`).

Check status / logs:
```bash
docker compose ps
docker compose logs -f web proxy-engine health-checker scraper
```

## 5. First use
1. Open `http://<server>:3333`, **Sign up**.
   - The app gates `/app` behind email verification — set the `SMTP_*` vars so the
     verification mail is sent, or grab the `verify-email/:token` link from the web logs.
2. Create a proxy list → import or scrape proxies → they auto health-check.
3. **Settings → API Keys**: create a key.
4. Use the proxy:
   ```bash
   curl -x "http://list-<id>:<API_KEY>@<server>:8000" https://api.ipify.org
   curl -x "socks5h://list-<id>:<API_KEY>@<server>:1080" https://api.ipify.org
   ```
   `GATEWAY_SECRET` works too as a master password for any list.

## 6. Public access — nginx + TLS (web UI only)
The web container publishes to `:3333`. To serve it on a domain with HTTPS you
need **either** the bundled Traefik (`--profile edge`) **or** your own host nginx
(recommended if nginx already runs on the server). A ready config is at
`infra/nginx/proxy-system.conf`:
```bash
sudo cp infra/nginx/proxy-system.conf /etc/nginx/sites-available/proxy-system
sudo ln -s /etc/nginx/sites-available/proxy-system /etc/nginx/sites-enabled/
# edit server_name to your domain, then:
sudo certbot --nginx -d proxy.example.com
sudo nginx -t && sudo systemctl reload nginx
```
- It reverse-proxies `https://your-domain → 127.0.0.1:3333` with the right
  `X-Forwarded-*` headers (the app already trusts them via `config/app.ts`).
- Recommended: bind the web port to localhost so only nginx can reach it — in
  `docker-compose.yml` set the web port mapping to `127.0.0.1:3333:3333`, and
  set `APP_URL=https://your-domain` in `.env`.

**The proxy GATEWAY is NOT proxied by nginx.** `8000` (HTTP proxy) and `1080`
(SOCKS5) are raw proxy protocols — open them in the firewall and have clients
connect straight to `your-server:8000` / `:1080`. (Optional L4 `stream`
passthrough example is in the nginx file.)

**What needs public access (server blocks already in the nginx file):**

| Service | Public? | How |
|---|---|---|
| Web UI | ✅ yes | nginx → `127.0.0.1:3333` + TLS |
| HTTP proxy `:8000` / SOCKS5 `:1080` | ✅ yes | **direct** (firewall), not via nginx |
| Grafana | optional | nginx → `127.0.0.1:3000` (set `GF_SERVER_ROOT_URL`) |
| RabbitMQ UI `:15673` / Prometheus `:9090` | ⚠️ avoid | SSH tunnel / VPN; if you must, the file has a Basic-Auth block |
| Postgres / Redis / RabbitMQ AMQP | ❌ no | docker network only |

For Grafana and the admin tools: edit the `server_name`, run `certbot -d <subdomain>`,
and bind those containers to `127.0.0.1` in `docker-compose.yml`. RabbitMQ/Prometheus
have weak built-in auth — keep them off the open internet or behind nginx Basic-Auth.

### Remote DB admin from your laptop (SSH tunnel — do NOT expose DB ports publicly)
Postgres/Redis/RabbitMQ are **raw TCP** services with no domain concept, and putting
them on the public internet is a major risk. They're published on the server's
`127.0.0.1` only. To reach them from your laptop (DBeaver, redis-cli, RabbitMQ UI),
forward the ports over SSH — encrypted, no public exposure:
```bash
ssh -N \
  -L 5432:127.0.0.1:5432 \    # postgres
  -L 6379:127.0.0.1:6379 \    # redis
  -L 5673:127.0.0.1:5673 \    # rabbitmq amqp
  -L 15673:127.0.0.1:15673 \  # rabbitmq management UI
  root@<server-ip>
```
Then connect on your laptop to `127.0.0.1` with the matching port and the
credentials from your server `.env`:
- **Postgres** — `127.0.0.1:5432`, db `proxy_system`, user/pass = `DB_USER`/`DB_PASSWORD`
- **Redis** — `127.0.0.1:6379`, auth = `REDIS_PASSWORD`
- **RabbitMQ** — AMQP `127.0.0.1:5673`; management UI `http://127.0.0.1:15673` (user/pass = `RABBITMQ_USER`/`RABBITMQ_PASSWORD`)

(RabbitMQ stays on `5673/15673` because a native rabbitmq still uses `5672/15672`
on this host. Containers always listen internally on `5432/6379/5672/15672`.)

## 7. Using your NATIVE postgres/redis/rabbitmq instead of the containers
Don't start the bundled datastores; point the apps at the host:
1. Remove `postgres`, `redis`, `rabbitmq` from `docker compose up` (or delete those
   services), and drop their `depends_on` entries.
2. Add to **each** app service in `docker-compose.yml`:
   ```yaml
   extra_hosts: ["host.docker.internal:host-gateway"]
   environment:
     DB_HOST: host.docker.internal
     DB_PORT: '5432'
     REDIS_HOST: host.docker.internal
     REDIS_PORT: '6379'
     RABBITMQ_HOST: host.docker.internal
     RABBITMQ_PORT: '5672'
   ```
3. Make sure the native services accept connections from the docker bridge
   (postgres `listen_addresses`/`pg_hba.conf`, redis `bind`, rabbitmq user/vhost).

## 8. Notes
- **health-checker image is large (~2 GB)** — it bundles Chromium for the `playwright`
  check mode. `request`/`crawlee` modes don't need it.
- Go service versions: Dockerfiles use `golang:1.25` (matches each `go.mod`). Bump if
  you raise the `go` directive.
- `proxy-engine` `/metrics` is behind `INTERNAL_API_SECRET`; Prometheus can't scrape it
  unless you remove that guard (see `infra/prometheus/prometheus.yml`).
