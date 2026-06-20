package metrics

import (
	"testing"
	"time"
)

func TestSourceHealthSummaryIncludesIdleRegisteredSource(t *testing.T) {
	resetSourceStateForTest()

	summary := SourceHealthSummary([]string{"geonode"})
	if len(summary) != 1 {
		t.Fatalf("expected 1 source, got %d", len(summary))
	}
	if summary[0].Source != "geonode" {
		t.Fatalf("expected geonode source, got %q", summary[0].Source)
	}
	if summary[0].Status != "idle" {
		t.Fatalf("expected idle status, got %q", summary[0].Status)
	}
}

func TestSourceHealthSummaryTracksHealthyAndDegradedStates(t *testing.T) {
	resetSourceStateForTest()

	startedAt := time.Now().Add(-2 * time.Second)
	ObserveSourceRun("geonode", "http", "success", startedAt, 42)
	ObserveSourceRun("geonode", "worker", "error", startedAt, 0)

	summary := SourceHealthSummary([]string{"geonode"})
	if len(summary) != 1 {
		t.Fatalf("expected 1 source, got %d", len(summary))
	}

	item := summary[0]
	if item.Status != "degraded" {
		t.Fatalf("expected degraded overall status, got %q", item.Status)
	}
	if item.SuccessfulRuns != 1 || item.ErrorRuns != 1 {
		t.Fatalf("unexpected run counts: %#v", item)
	}
	if len(item.Triggers) != 2 {
		t.Fatalf("expected 2 triggers, got %d", len(item.Triggers))
	}
}

func TestSourceHealthSummaryTracksMisconfiguredAndConsecutiveFailures(t *testing.T) {
	resetSourceStateForTest()

	startedAt := time.Now().Add(-time.Second)
	ObserveSourceRun("bad-source", "http", "unknown_source", startedAt, 0)
	ObserveSourceRun("proxydb", "worker", "error", startedAt, 0)
	ObserveSourceRun("proxydb", "worker", "error", startedAt, 0)
	ObserveSourceRun("proxydb", "worker", "error", startedAt, 0)

	summary := SourceHealthSummary([]string{"proxydb"})
	if len(summary) != 2 {
		t.Fatalf("expected 2 sources including unknown source, got %d", len(summary))
	}

	var proxydb, badSource *SourceHealth
	for i := range summary {
		switch summary[i].Source {
		case "proxydb":
			proxydb = &summary[i]
		case "bad-source":
			badSource = &summary[i]
		}
	}

	if proxydb == nil || proxydb.Status != "error" {
		t.Fatalf("expected proxydb error status, got %#v", proxydb)
	}
	if proxydb.ConsecutiveFailures != 3 {
		t.Fatalf("expected 3 consecutive failures, got %d", proxydb.ConsecutiveFailures)
	}
	if badSource == nil || badSource.Status != "misconfigured" {
		t.Fatalf("expected bad-source misconfigured status, got %#v", badSource)
	}
}

func resetSourceStateForTest() {
	sourceStateMu.Lock()
	defer sourceStateMu.Unlock()
	sourceStates = map[string]*sourceRunState{}
}
