package adapters

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPFetchWithFallbackUsesNextURL(t *testing.T) {
	t.Setenv("SCRAPER_HTTP_RETRY_ATTEMPTS", "1")
	t.Setenv("SCRAPER_HTTP_RETRY_BACKOFF_MS", "0")

	failServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "upstream down", http.StatusBadGateway)
	}))
	defer failServer.Close()

	okServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("1.2.3.4:80"))
	}))
	defer okServer.Close()

	body, err := httpGetAny(failServer.URL, okServer.URL)
	if err != nil {
		t.Fatalf("expected fallback success, got error: %v", err)
	}
	if body != "1.2.3.4:80" {
		t.Fatalf("unexpected body %q", body)
	}
}

func TestHTTPFetchWithFallbackRetriesTransientHTTPStatus(t *testing.T) {
	t.Setenv("SCRAPER_HTTP_RETRY_ATTEMPTS", "2")
	t.Setenv("SCRAPER_HTTP_RETRY_BACKOFF_MS", "0")

	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		attempts++
		if attempts == 1 {
			http.Error(w, "try again", http.StatusTooManyRequests)
			return
		}
		_, _ = w.Write([]byte("5.6.7.8:8080"))
	}))
	defer server.Close()

	body, err := httpGet(server.URL)
	if err != nil {
		t.Fatalf("expected retry success, got error: %v", err)
	}
	if attempts != 2 {
		t.Fatalf("expected 2 attempts, got %d", attempts)
	}
	if body != "5.6.7.8:8080" {
		t.Fatalf("unexpected body %q", body)
	}
}

func TestShouldRetryHTTPStatus(t *testing.T) {
	if !shouldRetryHTTPStatus(http.StatusTooManyRequests) {
		t.Fatal("expected 429 to be retryable")
	}
	if !shouldRetryHTTPStatus(http.StatusBadGateway) {
		t.Fatal("expected 502 to be retryable")
	}
	if shouldRetryHTTPStatus(http.StatusNotFound) {
		t.Fatal("expected 404 to be non-retryable")
	}
}
