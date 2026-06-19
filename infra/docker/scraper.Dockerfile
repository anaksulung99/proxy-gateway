# ============================================================
# Dockerfile — Go Scraper Service
# ============================================================

FROM golang:1.25-alpine AS development
WORKDIR /app

RUN apk add --no-cache git curl wget

RUN go install github.com/air-verse/air@latest

COPY apps/scraper/go.mod apps/scraper/go.sum ./
RUN go mod download

EXPOSE 8081
EXPOSE 9300

CMD ["air", "-c", ".air.toml"]

# ── Builder
FROM golang:1.25-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY apps/scraper/go.mod apps/scraper/go.sum ./
RUN go mod download && go mod verify

COPY apps/scraper/ .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -tags netgo \
    -o /scraper \
    ./main.go

# ── Production
FROM scratch AS production

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /scraper /scraper

EXPOSE 8081
EXPOSE 9300

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/scraper", "health"]

ENTRYPOINT ["/scraper"]
