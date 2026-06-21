# ============================================================
# Go Health Checker — build context = apps/health-checker
#
# The `playwright` check mode drives a real headless Chromium via playwright-go,
# which needs (a) the playwright node driver and (b) a matching Chromium build
# plus its system libraries. We install all of that with `playwright install
# --with-deps` (apt-installs the libs) into a single Debian image. The image is
# large (~2 GB) but reliable; `request` and `crawlee` modes don't need it.
#
# If you only use the request/crawlee modes, build a leaner image (~1 GB, no
# Chromium) with:  --build-arg INSTALL_CHROMIUM=false  (or CHECKER_INSTALL_CHROMIUM
# in .env). The playwright mode is then unavailable.
# ============================================================
FROM golang:1.25-bookworm AS build
WORKDIR /src

RUN apt-get update \
 && apt-get install -y --no-install-recommends wget ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY go.mod go.sum ./
RUN go mod download
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /usr/local/bin/health-checker .

# Driver + Chromium (playwright-go) and the browser's system deps.
# Cache lands in /root/.cache/ms-playwright(-go); the binary runs as root so it
# is found at runtime. Set INSTALL_CHROMIUM=false to skip it (~1 GB smaller).
ARG INSTALL_CHROMIUM=true
RUN if [ "$INSTALL_CHROMIUM" = "true" ]; then \
      go run github.com/playwright-community/playwright-go/cmd/playwright install --with-deps chromium; \
    else \
      echo "INSTALL_CHROMIUM=$INSTALL_CHROMIUM — skipping Chromium; playwright check mode will be unavailable"; \
    fi

EXPOSE 8003
ENTRYPOINT ["health-checker"]
