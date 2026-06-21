package gateway

import (
	"errors"
	"testing"
)

func TestObserveTunnelLifecycleEstablished(t *testing.T) {
	results := make(chan tunnelCopyResult, 2)
	results <- tunnelCopyResult{direction: "client_to_upstream", bytes: 128}
	results <- tunnelCopyResult{direction: "upstream_to_client", bytes: 256}

	observation := observeTunnelLifecycle(results)
	if observation.responseBytes != 256 {
		t.Fatalf("expected response bytes 256, got %d", observation.responseBytes)
	}
	if observation.message != "Tunnel established" {
		t.Fatalf("expected established message, got %q", observation.message)
	}
}

func TestObserveTunnelLifecycleUpstreamIssue(t *testing.T) {
	results := make(chan tunnelCopyResult, 2)
	results <- tunnelCopyResult{direction: "client_to_upstream", bytes: 128}
	results <- tunnelCopyResult{direction: "upstream_to_client", err: errors.New("tls: handshake timeout")}

	observation := observeTunnelLifecycle(results)
	if observation.message != "Tunnel established; upstream stream error: tls: handshake timeout" {
		t.Fatalf("unexpected message: %q", observation.message)
	}
}

func TestObserveTunnelLifecycleNoPayload(t *testing.T) {
	results := make(chan tunnelCopyResult, 2)
	results <- tunnelCopyResult{direction: "client_to_upstream", bytes: 64}
	results <- tunnelCopyResult{direction: "upstream_to_client", bytes: 0}

	observation := observeTunnelLifecycle(results)
	if observation.message != "Tunnel established; client sent payload but upstream returned no payload" {
		t.Fatalf("unexpected message: %q", observation.message)
	}
}
