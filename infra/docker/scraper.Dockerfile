# ============================================================
# Go Scraper — build context = apps/scraper
# ============================================================
FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /out/scraper .

# ---- runtime ----
FROM alpine:3.20 AS production
RUN apk add --no-cache ca-certificates tzdata wget
COPY --from=build /out/scraper /usr/local/bin/scraper
EXPOSE 8002
ENTRYPOINT ["scraper"]
