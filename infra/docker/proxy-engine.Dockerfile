# ============================================================
# Dockerfile — Go Proxy Engine
# Multi-stage: development (air live reload) & production (scratch)
# ============================================================

# ── Development stage
FROM golang:1.25-alpine AS development
WORKDIR /app

RUN apk add --no-cache git curl wget

# Install Air untuk live reload
RUN go install github.com/air-verse/air@latest

# Download dependencies dulu (layer cache)
COPY apps/proxy-engine/go.mod apps/proxy-engine/go.sum ./
RUN go mod download

EXPOSE 8080
# Metrics port
EXPOSE 9200
# HTTP Proxy port
EXPOSE 3128
# SOCKS5 port
EXPOSE 1080

# Air akan di-override via docker-compose command
CMD ["air", "-c", ".air.toml"]

# ── Builder stage
FROM golang:1.25-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY apps/proxy-engine/go.mod apps/proxy-engine/go.sum ./
RUN go mod download && go mod verify

COPY apps/proxy-engine/ .

# Build binary — fully static, no CGO
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -tags netgo \
    -o /proxy-engine \
    ./main.go

# ── Production stage — minimal image
FROM scratch AS production

# Copy SSL certs untuk HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy binary
COPY --from=builder /proxy-engine /proxy-engine

EXPOSE 8080
EXPOSE 9200
EXPOSE 3128
EXPOSE 1080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/proxy-engine", "health"]

ENTRYPOINT ["/proxy-engine"]
