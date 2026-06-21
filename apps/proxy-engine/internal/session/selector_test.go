package session

import (
	"context"
	"testing"

	"github.com/proxy-system/proxy-engine/internal/pool"
)

func TestPickPerRequestAndStickyWithoutRedis(t *testing.T) {
	sel := NewSelector(nil)
	candidates := []pool.Upstream{
		{ID: 10, Host: "1.1.1.1", Port: 80, Protocol: "http"},
		{ID: 11, Host: "2.2.2.2", Port: 8080, Protocol: "http"},
	}

	got, err := sel.Pick(context.Background(), 7, pool.Rotation{Type: "per_request"}, "", "", candidates)
	if err != nil {
		t.Fatalf("unexpected error for per_request: %v", err)
	}
	if got.ID != 10 && got.ID != 11 {
		t.Fatalf("unexpected upstream picked: %+v", got)
	}

	got, err = sel.Pick(context.Background(), 7, pool.Rotation{Type: "sticky", StickyMinutes: 5}, "sess-a", "", candidates)
	if err != nil {
		t.Fatalf("unexpected error for sticky without redis: %v", err)
	}
	if got.ID != 10 && got.ID != 11 {
		t.Fatalf("unexpected sticky upstream picked: %+v", got)
	}
}

func TestRotationKeyAndInvalidateNoop(t *testing.T) {
	sel := NewSelector(nil)

	if key := sel.rotationKey(12, "sticky", "abc", ""); key != "session:12:abc:" {
		t.Fatalf("unexpected sticky key: %s", key)
	}
	if key := sel.rotationKey(12, "interval", "", ""); key != "rotation:12:" {
		t.Fatalf("unexpected interval key: %s", key)
	}
	// Country override namespaces the key so different geo targets don't collide.
	if key := sel.rotationKey(12, "interval", "", "id"); key != "rotation:12:ID" {
		t.Fatalf("unexpected interval key with country: %s", key)
	}
	if key := sel.rotationKey(12, "per_request", "", ""); key != "" {
		t.Fatalf("expected empty key for per_request, got %s", key)
	}

	sel.Invalidate(context.Background(), 12, pool.Rotation{Type: "sticky"}, "abc", "")
}
