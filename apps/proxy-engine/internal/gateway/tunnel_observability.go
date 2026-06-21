package gateway

import (
	"errors"
	"fmt"
	"io"
	"net"
	"strings"
)

type tunnelCopyResult struct {
	direction string
	bytes     int64
	err       error
}

type tunnelObservation struct {
	responseBytes int64
	message       string
}

func copyTunnel(dst io.Writer, src io.Reader, direction string, results chan<- tunnelCopyResult) {
	n, err := io.Copy(dst, src)
	results <- tunnelCopyResult{
		direction: direction,
		bytes:     n,
		err:       err,
	}
}

func observeTunnelLifecycle(results <-chan tunnelCopyResult) tunnelObservation {
	var upstreamToClient tunnelCopyResult
	var clientToUpstream tunnelCopyResult

	for i := 0; i < 2; i++ {
		result := <-results
		if result.direction == "upstream_to_client" {
			upstreamToClient = result
		} else {
			clientToUpstream = result
		}
	}

	message := "Tunnel established"
	switch {
	case isSignificantTunnelError(upstreamToClient.err):
		message = fmt.Sprintf(
			"Tunnel established; upstream stream error: %s",
			describeTunnelError(upstreamToClient.err),
		)
	case isSignificantTunnelError(clientToUpstream.err):
		message = fmt.Sprintf(
			"Tunnel established; client stream error: %s",
			describeTunnelError(clientToUpstream.err),
		)
	case upstreamToClient.bytes == 0 && clientToUpstream.bytes == 0:
		message = "Tunnel established; closed without payload"
	case clientToUpstream.bytes > 0 && upstreamToClient.bytes == 0:
		message = "Tunnel established; client sent payload but upstream returned no payload"
	}

	return tunnelObservation{
		responseBytes: upstreamToClient.bytes,
		message:       message,
	}
}

func isSignificantTunnelError(err error) bool {
	if err == nil || errors.Is(err, io.EOF) || errors.Is(err, net.ErrClosed) {
		return false
	}

	msg := strings.ToLower(err.Error())
	if msg == "" {
		return false
	}

	ignored := []string{
		"use of closed network connection",
		"forcibly closed by the remote host",
		"connection reset by peer",
		"broken pipe",
		"wsarecv",
		"wsasend",
	}
	for _, fragment := range ignored {
		if strings.Contains(msg, fragment) {
			return false
		}
	}

	return true
}

func describeTunnelError(err error) string {
	if err == nil {
		return "unknown tunnel error"
	}
	return err.Error()
}
