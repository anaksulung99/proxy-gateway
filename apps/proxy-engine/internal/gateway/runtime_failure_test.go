package gateway

import (
	"errors"
	"testing"
)

func TestIsUpstreamRuntimeFailure(t *testing.T) {
	plain := errors.New("plain error")
	if isUpstreamRuntimeFailure(plain) {
		t.Fatal("plain error should not be treated as upstream runtime failure")
	}

	wrapped := wrapUpstreamRuntimeError(plain)
	if !isUpstreamRuntimeFailure(wrapped) {
		t.Fatal("wrapped upstream runtime error should be detected")
	}
}
