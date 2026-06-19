# ============================================================
# Dockerfile — Go Health Checker
# Butuh Playwright Chromium — pakai debian base, bukan scratch
# ============================================================

FROM golang:1.25-alpine AS development
WORKDIR /app

RUN apk add --no-cache git curl wget

RUN go install github.com/air-verse/air@latest

COPY apps/health-checker/go.mod apps/health-checker/go.sum ./
RUN go mod download

EXPOSE 8082
EXPOSE 9400

CMD ["air", "-c", ".air.toml"]

# ── Builder
FROM golang:1.25-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY apps/health-checker/go.mod apps/health-checker/go.sum ./
RUN go mod download && go mod verify

COPY apps/health-checker/ .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s" \
    -o /health-checker \
    ./main.go

# ── Production — Debian slim (butuh untuk Playwright Chromium)
FROM debian:bookworm-slim AS production

# Install Playwright dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Chromium dependencies
    chromium \
    chromium-driver \
    # Font rendering
    fonts-liberation \
    fonts-noto-color-emoji \
    # Network tools
    wget \
    curl \
    ca-certificates \
    # Cleanup
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Non-root user
RUN groupadd -r checker && useradd -r -g checker -u 1001 checker

# Playwright env
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV CHROMIUM_PATH=/usr/bin/chromium

WORKDIR /app

COPY --from=builder /health-checker .
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Install Playwright browser (via Go playwright-go init)
RUN chown -R checker:checker /app

USER checker

EXPOSE 8082
EXPOSE 9400

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8082/health || exit 1

ENTRYPOINT ["./health-checker"]
