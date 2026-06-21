package gateway

import (
	"context"
	"encoding/binary"
	"io"
	"net"
	"strconv"
	"time"

	"github.com/proxy-system/proxy-engine/internal/usage"
)

// SOCKS5 (RFC 1928) inbound frontend. Reuses the same auth / pool selection /
// upstream tunnelling as the HTTP gateway. Username/password auth (RFC 1929)
// carries the routing username and the API key / master secret.
type Socks5Server struct {
	gw       *Gateway
	listener net.Listener
}

func NewSocks5Server(gw *Gateway) *Socks5Server {
	return &Socks5Server{gw: gw}
}

func (s *Socks5Server) ListenAndServe(addr string) error {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	s.listener = ln
	s.gw.log.Info().Str("addr", addr).Msg("socks5 gateway listening")
	for {
		conn, err := ln.Accept()
		if err != nil {
			return err
		}
		go s.handle(conn)
	}
}

func (s *Socks5Server) Close() error {
	if s.listener == nil {
		return nil
	}
	return s.listener.Close()
}

func (s *Socks5Server) handle(conn net.Conn) {
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(30 * time.Second))

	// --- greeting: VER, NMETHODS, METHODS ---
	head := make([]byte, 2)
	if _, err := io.ReadFull(conn, head); err != nil || head[0] != 0x05 {
		return
	}
	methods := make([]byte, int(head[1]))
	if _, err := io.ReadFull(conn, methods); err != nil {
		return
	}
	// We require username/password auth (0x02).
	supportsUserPass := false
	for _, m := range methods {
		if m == 0x02 {
			supportsUserPass = true
		}
	}
	if !supportsUserPass {
		_, _ = conn.Write([]byte{0x05, 0xFF})
		return
	}
	if _, err := conn.Write([]byte{0x05, 0x02}); err != nil {
		return
	}

	// --- username/password auth (RFC 1929) ---
	user, pass, err := readUserPass(conn)
	if err != nil {
		return
	}
	ctx := context.Background()
	listID, sessionID, country, auth, reason, ok := s.gw.authorize(ctx, user, pass)
	if !ok {
		s.gw.log.Warn().
			Str("remote_addr", conn.RemoteAddr().String()).
			Str("username", user).
			Str("reason", reason).
			Msg("socks5 authentication failed")
		_, _ = conn.Write([]byte{0x01, 0x01}) // auth failure
		return
	}
	if _, err := conn.Write([]byte{0x01, 0x00}); err != nil { // auth success
		return
	}

	// --- request: VER, CMD, RSV, ATYP, ADDR, PORT ---
	target, ok := readRequest(conn)
	if !ok {
		_, _ = conn.Write(socksReply(0x07)) // command/address not supported
		return
	}

	startedAt := time.Now()
	targetHost, targetPortStr, _ := net.SplitHostPort(target)
	targetPort, _ := strconv.Atoi(targetPortStr)

	// --- select upstream with small failover ---
	dialCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	_ = conn.SetDeadline(time.Time{}) // clear handshake deadline for the tunnel

	var (
		excluded []int64
		upConn   net.Conn
		chosen   = struct {
			teamID, listConfigID, entryID int64
			protocol, cc                  string
			asn                           int
		}{}
		lastErr error
	)
	for attempt := 1; attempt <= 3; attempt++ {
		upstream, cfg, serr := s.gw.selectUpstream(dialCtx, listID, sessionID, country, auth, excluded)
		if serr != nil {
			lastErr = serr
			break
		}
		chosen.teamID = cfg.TeamID
		chosen.listConfigID = cfg.ID
		chosen.entryID = upstream.ID
		chosen.protocol = upstream.Protocol
		chosen.cc = upstream.CountryCode
		chosen.asn = upstream.ASN

		if attempt == 1 {
			if blocked, reason := s.gw.quotaBlocked(dialCtx, cfg, auth); blocked {
				_, _ = conn.Write(socksReply(0x02)) // not allowed by ruleset
				s.gw.recordUsage(usage.Event{
					TeamID:          cfg.TeamID,
					ProxyListID:     cfg.ID,
					APIKeyID:        auth.keyID,
					RequestMethod:   "CONNECT",
					TargetHost:      targetHost,
					TargetPort:      targetPort,
					TargetScheme:    "socks5",
					IsTunnel:        true,
					Success:         false,
					DurationMs:      time.Since(startedAt).Milliseconds(),
					SessionKey:      sessionID,
					CountryOverride: country,
					ErrorMessage:    reason,
					RequestedAt:     startedAt.UTC(),
				})
				return
			}
		}

		c, derr := dialThroughUpstream(dialCtx, upstream, target)
		if derr == nil {
			s.gw.observeUpstreamSuccess(dialCtx, upstream.ID)
			upConn = c
			break
		}
		lastErr = derr
		s.gw.observeUpstreamFailure(dialCtx, cfg.ID, upstream, wrapUpstreamRuntimeError(derr))
		s.gw.sel.Invalidate(dialCtx, listID, cfg.Rotation, sessionID, country)
		excluded = append(excluded, upstream.ID)
	}

	if upConn == nil {
		_, _ = conn.Write(socksReply(0x05)) // connection refused
		s.gw.recordUsage(usage.Event{
			TeamID:           chosen.teamID,
			ProxyListID:      listID,
			ProxyEntryID:     chosen.entryID,
			APIKeyID:         auth.keyID,
			RequestMethod:    "CONNECT",
			TargetHost:       targetHost,
			TargetPort:       targetPort,
			TargetScheme:     "socks5",
			IsTunnel:         true,
			Success:          false,
			StatusCode:       0,
			DurationMs:       time.Since(startedAt).Milliseconds(),
			SessionKey:       sessionID,
			CountryOverride:  country,
			SelectedProtocol: chosen.protocol,
			SelectedCountry:  chosen.cc,
			SelectedASN:      chosen.asn,
			ErrorMessage:     lastErrorMessage(lastErr),
			RequestedAt:      startedAt.UTC(),
		})
		return
	}
	defer upConn.Close()

	if _, err := conn.Write(socksReply(0x00)); err != nil { // success
		return
	}

	results := make(chan tunnelCopyResult, 2)
	go copyTunnel(upConn, conn, "client_to_upstream", results)
	go copyTunnel(conn, upConn, "upstream_to_client", results)

	observation := observeTunnelLifecycle(results)
	s.gw.quota.Add(dialCtx, chosen.teamID, auth.keyID, observation.responseBytes)
	s.gw.recordUsage(usage.Event{
		TeamID:           chosen.teamID,
		ProxyListID:      chosen.listConfigID,
		ProxyEntryID:     chosen.entryID,
		APIKeyID:         auth.keyID,
		RequestMethod:    "CONNECT",
		TargetHost:       targetHost,
		TargetPort:       targetPort,
		TargetScheme:     "socks5",
		IsTunnel:         true,
		Success:          true,
		StatusCode:       200,
		AttemptCount:     len(excluded) + 1,
		DurationMs:       time.Since(startedAt).Milliseconds(),
		ResponseBytes:    observation.responseBytes,
		SessionKey:       sessionID,
		CountryOverride:  country,
		SelectedProtocol: chosen.protocol,
		SelectedCountry:  chosen.cc,
		SelectedASN:      chosen.asn,
		ErrorMessage:     observation.message,
		RequestedAt:      startedAt.UTC(),
	})
}

// readUserPass parses an RFC 1929 username/password sub-negotiation.
func readUserPass(conn net.Conn) (string, string, error) {
	ver := make([]byte, 1)
	if _, err := io.ReadFull(conn, ver); err != nil {
		return "", "", err
	}
	ulen := make([]byte, 1)
	if _, err := io.ReadFull(conn, ulen); err != nil {
		return "", "", err
	}
	uname := make([]byte, int(ulen[0]))
	if _, err := io.ReadFull(conn, uname); err != nil {
		return "", "", err
	}
	plen := make([]byte, 1)
	if _, err := io.ReadFull(conn, plen); err != nil {
		return "", "", err
	}
	passwd := make([]byte, int(plen[0]))
	if _, err := io.ReadFull(conn, passwd); err != nil {
		return "", "", err
	}
	return string(uname), string(passwd), nil
}

// readRequest parses the SOCKS5 CONNECT request and returns "host:port".
func readRequest(conn net.Conn) (string, bool) {
	head := make([]byte, 4) // VER, CMD, RSV, ATYP
	if _, err := io.ReadFull(conn, head); err != nil {
		return "", false
	}
	if head[0] != 0x05 || head[1] != 0x01 { // only CONNECT
		return "", false
	}

	var host string
	switch head[3] {
	case 0x01: // IPv4
		b := make([]byte, 4)
		if _, err := io.ReadFull(conn, b); err != nil {
			return "", false
		}
		host = net.IP(b).String()
	case 0x03: // domain
		l := make([]byte, 1)
		if _, err := io.ReadFull(conn, l); err != nil {
			return "", false
		}
		b := make([]byte, int(l[0]))
		if _, err := io.ReadFull(conn, b); err != nil {
			return "", false
		}
		host = string(b)
	case 0x04: // IPv6
		b := make([]byte, 16)
		if _, err := io.ReadFull(conn, b); err != nil {
			return "", false
		}
		host = net.IP(b).String()
	default:
		return "", false
	}

	portB := make([]byte, 2)
	if _, err := io.ReadFull(conn, portB); err != nil {
		return "", false
	}
	port := binary.BigEndian.Uint16(portB)
	return net.JoinHostPort(host, strconv.Itoa(int(port))), true
}

func socksReply(rep byte) []byte {
	// VER, REP, RSV, ATYP(IPv4), BND.ADDR(0.0.0.0), BND.PORT(0)
	return []byte{0x05, rep, 0x00, 0x01, 0, 0, 0, 0, 0, 0}
}
