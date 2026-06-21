# ============================================================
# Go Proxy Engine — build context = apps/proxy-engine
# ============================================================
FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /out/proxy-engine .

# ---- runtime (alpine so the wget healthcheck works) ----
FROM alpine:3.20 AS production
RUN apk add --no-cache ca-certificates tzdata wget
COPY --from=build /out/proxy-engine /usr/local/bin/proxy-engine
# 8000 = HTTP forward proxy · 1080 = SOCKS5 · 8001 = admin/health
EXPOSE 8000 1080 8001
ENTRYPOINT ["proxy-engine"]
