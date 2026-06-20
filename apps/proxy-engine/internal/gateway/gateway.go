package gateway

import (
	"bufio"
	"context"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/proxy-system/proxy-engine/internal/apikey"
	"github.com/proxy-system/proxy-engine/internal/filter"
	"github.com/proxy-system/proxy-engine/internal/pool"
	"github.com/proxy-system/proxy-engine/internal/session"
	"github.com/proxy-system/proxy-engine/internal/usage"
	"github.com/rs/zerolog"
	xproxy "golang.org/x/net/proxy"
)

var hopHeaders = []string{
	"Connection", "Proxy-Connection", "Keep-Alive", "Proxy-Authenticate",
	"Proxy-Authorization", "Te", "Trailers", "Transfer-Encoding", "Upgrade",
}

type Gateway struct {
	repo   *pool.Repository
	sel    *session.Selector
	secret string
	keys   *apikey.Validator
	usage  *usage.Sink
	log    zerolog.Logger
	srv    *http.Server
}

func New(repo *pool.Repository, sel *session.Selector, secret string, keys *apikey.Validator, usageSink *usage.Sink, log zerolog.Logger) *Gateway {
	return &Gateway{repo: repo, sel: sel, secret: secret, keys: keys, usage: usageSink, log: log}
}

// authIdentity is the resolved caller after a successful Proxy-Authorization.
type authIdentity struct {
	master bool  // authenticated with the master GATEWAY_SECRET
	teamID int64 // owning team (for API-key auth)
	keyID  int64 // api_keys.id (for last-used tracking)
}

func (g *Gateway) ListenAndServe(addr string) error {
	g.srv = &http.Server{
		Addr:              addr,
		Handler:           g,
		ReadHeaderTimeout: 30 * time.Second,
	}
	g.log.Info().Str("addr", addr).Msg("proxy gateway listening")
	return g.srv.ListenAndServe()
}

func (g *Gateway) Shutdown(ctx context.Context) error {
	if g.srv == nil {
		return nil
	}
	return g.srv.Shutdown(ctx)
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now()
	targetHost, targetPort, targetScheme := targetDetails(r)
	listID, sessionID, country, auth, ok := g.authenticate(r)
	if !ok {
		w.Header().Set("Proxy-Authenticate", `Basic realm="proxy"`)
		http.Error(w, "Proxy authentication required", http.StatusProxyAuthRequired)
		g.recordUsage(usage.Event{
			RequestMethod:   r.Method,
			TargetHost:      targetHost,
			TargetPort:      int(targetPort),
			TargetScheme:    targetScheme,
			IsTunnel:        r.Method == http.MethodConnect,
			Success:         false,
			StatusCode:      http.StatusProxyAuthRequired,
			AttemptCount:    0,
			DurationMs:      time.Since(startedAt).Milliseconds(),
			CountryOverride: country,
			ErrorMessage:    "proxy authentication required",
			RequestedAt:     startedAt.UTC(),
		})
		return
	}

	cfg, err := g.repo.Load(r.Context(), listID)
	if err != nil {
		g.log.Warn().Err(err).Int64("list", listID).Msg("load list failed")
		http.Error(w, "Bad gateway: list unavailable", http.StatusBadGateway)
		g.recordUsage(usage.Event{
			TeamID:          cfgTeamID(cfg),
			ProxyListID:     listID,
			RequestMethod:   r.Method,
			TargetHost:      targetHost,
			TargetPort:      int(targetPort),
			TargetScheme:    targetScheme,
			IsTunnel:        r.Method == http.MethodConnect,
			Success:         false,
			StatusCode:      http.StatusBadGateway,
			AttemptCount:    0,
			DurationMs:      time.Since(startedAt).Milliseconds(),
			SessionKey:      sessionID,
			CountryOverride: country,
			ErrorMessage:    err.Error(),
			RequestedAt:     startedAt.UTC(),
		})
		return
	}
	if !cfg.IsActive {
		http.Error(w, "List is inactive", http.StatusForbidden)
		g.recordUsage(usage.Event{
			TeamID:          cfg.TeamID,
			ProxyListID:     cfg.ID,
			RequestMethod:   r.Method,
			TargetHost:      targetHost,
			TargetPort:      int(targetPort),
			TargetScheme:    targetScheme,
			IsTunnel:        r.Method == http.MethodConnect,
			Success:         false,
			StatusCode:      http.StatusForbidden,
			AttemptCount:    0,
			DurationMs:      time.Since(startedAt).Milliseconds(),
			SessionKey:      sessionID,
			CountryOverride: country,
			ErrorMessage:    "list inactive",
			RequestedAt:     startedAt.UTC(),
		})
		return
	}

	// API keys are team-scoped: the key's team must own the requested list.
	if !auth.master && auth.teamID != cfg.TeamID {
		http.Error(w, "API key not authorized for this list", http.StatusForbidden)
		g.recordUsage(usage.Event{
			TeamID:          cfg.TeamID,
			ProxyListID:     cfg.ID,
			RequestMethod:   r.Method,
			TargetHost:      targetHost,
			TargetPort:      int(targetPort),
			TargetScheme:    targetScheme,
			IsTunnel:        r.Method == http.MethodConnect,
			Success:         false,
			StatusCode:      http.StatusForbidden,
			DurationMs:      time.Since(startedAt).Milliseconds(),
			SessionKey:      sessionID,
			CountryOverride: country,
			ErrorMessage:    "api key team mismatch",
			RequestedAt:     startedAt.UTC(),
		})
		return
	}
	if g.keys != nil {
		g.keys.TouchLastUsed(auth.keyID)
	}

	candidates := filter.Apply(cfg.Proxies, cfg.Rotation, country)
	if len(candidates) == 0 {
		g.log.Warn().Int64("list", listID).Int("pool", len(cfg.Proxies)).Int("filtered", len(candidates)).Msg("no upstream")
		http.Error(w, "No proxy available", http.StatusBadGateway)
		g.recordUsage(usage.Event{
			TeamID:          cfg.TeamID,
			ProxyListID:     cfg.ID,
			RequestMethod:   r.Method,
			TargetHost:      targetHost,
			TargetPort:      int(targetPort),
			TargetScheme:    targetScheme,
			IsTunnel:        r.Method == http.MethodConnect,
			Success:         false,
			StatusCode:      http.StatusBadGateway,
			AttemptCount:    0,
			DurationMs:      time.Since(startedAt).Milliseconds(),
			SessionKey:      sessionID,
			CountryOverride: country,
			ErrorMessage:    "no proxy available",
			RequestedAt:     startedAt.UTC(),
		})
		return
	}

	remaining := append([]pool.Upstream(nil), candidates...)
	attemptLimit := minInt(len(candidates), 3)
	var lastErr error
	var lastOutcome upstreamResult
	var selectedUpstream pool.Upstream
	for attempt := 1; attempt <= attemptLimit; attempt++ {
		upstream, err := g.sel.Pick(r.Context(), listID, cfg.Rotation, sessionID, remaining)
		if err != nil {
			lastErr = err
			break
		}
		selectedUpstream = upstream

		var reqErr error
		if r.Method == http.MethodConnect {
			lastOutcome, reqErr = g.handleConnect(w, r, upstream)
		} else {
			lastOutcome, reqErr = g.handleHTTP(w, r, upstream)
		}
		if reqErr == nil {
			g.log.Info().
				Int64("list", listID).
				Str("session", sessionID).
				Str("country", country).
				Int64("upstream_id", upstream.ID).
				Str("protocol", upstream.Protocol).
				Int("attempt", attempt).
				Msg("upstream request succeeded")
			g.recordUsage(usage.Event{
				TeamID:           cfg.TeamID,
				ProxyListID:      cfg.ID,
				ProxyEntryID:     upstream.ID,
				RequestMethod:    r.Method,
				TargetHost:       targetHost,
				TargetPort:       int(targetPort),
				TargetScheme:     targetScheme,
				IsTunnel:         r.Method == http.MethodConnect,
				Success:          true,
				StatusCode:       lastOutcome.StatusCode,
				AttemptCount:     attempt,
				DurationMs:       time.Since(startedAt).Milliseconds(),
				ResponseBytes:    lastOutcome.ResponseBytes,
				SessionKey:       sessionID,
				CountryOverride:  country,
				SelectedProtocol: upstream.Protocol,
				SelectedCountry:  upstream.CountryCode,
				SelectedASN:      upstream.ASN,
				RequestedAt:      startedAt.UTC(),
			})
			return
		}

		lastErr = reqErr
		g.sel.Invalidate(r.Context(), listID, cfg.Rotation, sessionID)
		remaining = withoutUpstreamID(remaining, upstream.ID)
		g.log.Warn().
			Err(reqErr).
			Int64("list", listID).
			Str("session", sessionID).
			Str("country", country).
			Int64("upstream_id", upstream.ID).
			Str("protocol", upstream.Protocol).
			Int("attempt", attempt).
			Int("remaining", len(remaining)).
			Msg("upstream request failed")
		if len(remaining) == 0 {
			break
		}
	}

	http.Error(w, "Upstream request failed: "+lastErrorMessage(lastErr), http.StatusBadGateway)
	g.recordUsage(usage.Event{
		TeamID:           cfg.TeamID,
		ProxyListID:      cfg.ID,
		ProxyEntryID:     selectedUpstream.ID,
		RequestMethod:    r.Method,
		TargetHost:       targetHost,
		TargetPort:       int(targetPort),
		TargetScheme:     targetScheme,
		IsTunnel:         r.Method == http.MethodConnect,
		Success:          false,
		StatusCode:       http.StatusBadGateway,
		AttemptCount:     attemptLimit,
		DurationMs:       time.Since(startedAt).Milliseconds(),
		ResponseBytes:    lastOutcome.ResponseBytes,
		SessionKey:       sessionID,
		CountryOverride:  country,
		SelectedProtocol: selectedUpstream.Protocol,
		SelectedCountry:  selectedUpstream.CountryCode,
		SelectedASN:      selectedUpstream.ASN,
		ErrorMessage:     lastErrorMessage(lastErr),
		RequestedAt:      startedAt.UTC(),
	})
}

// authenticate parses Proxy-Authorization (Basic). The password is either the
// master GATEWAY_SECRET (works for any list) or a per-team API key (the list's
// team must match the key's team — enforced after the list is loaded). Username
// encodes routing: a bare list id ("1") or "list-<id>[-session-<sid>][-country-<cc>]".
func (g *Gateway) authenticate(r *http.Request) (listID int64, sessionID, country string, auth authIdentity, ok bool) {
	h := r.Header.Get("Proxy-Authorization")
	if !strings.HasPrefix(h, "Basic ") {
		return 0, "", "", authIdentity{}, false
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(h, "Basic "))
	if err != nil {
		return 0, "", "", authIdentity{}, false
	}
	user, pass, found := strings.Cut(string(raw), ":")
	if !found {
		return 0, "", "", authIdentity{}, false
	}

	if g.secret != "" && subtle.ConstantTimeCompare([]byte(pass), []byte(g.secret)) == 1 {
		auth.master = true
	} else if g.keys != nil {
		teamID, keyID, valid := g.keys.Validate(r.Context(), pass)
		if !valid {
			return 0, "", "", authIdentity{}, false
		}
		auth.teamID, auth.keyID = teamID, keyID
	} else {
		return 0, "", "", authIdentity{}, false
	}

	listID, sessionID, country = parseUser(user)
	if listID == 0 {
		return 0, "", "", authIdentity{}, false
	}
	return listID, sessionID, country, auth, true
}

func parseUser(u string) (listID int64, sessionID, country string) {
	if n, err := strconv.ParseInt(u, 10, 64); err == nil {
		return n, "", ""
	}
	parts := strings.Split(u, "-")
	for i := 0; i+1 < len(parts); i += 2 {
		switch parts[i] {
		case "list":
			listID, _ = strconv.ParseInt(parts[i+1], 10, 64)
		case "session":
			sessionID = parts[i+1]
		case "country":
			country = parts[i+1]
		}
	}
	return listID, sessionID, country
}

func upstreamAddr(u pool.Upstream) string {
	return net.JoinHostPort(u.Host, strconv.Itoa(u.Port))
}

func isSocks(u pool.Upstream) bool {
	return strings.HasPrefix(strings.ToLower(u.Protocol), "socks")
}

// dialThroughUpstream opens a TCP tunnel to target via the upstream proxy.
func dialThroughUpstream(ctx context.Context, u pool.Upstream, target string) (net.Conn, error) {
	if isSocks(u) {
		var auth *xproxy.Auth
		if u.Username != "" {
			auth = &xproxy.Auth{User: u.Username, Password: u.Password}
		}
		d, err := xproxy.SOCKS5("tcp", upstreamAddr(u), auth, xproxy.Direct)
		if err != nil {
			return nil, err
		}
		if cd, ok := d.(xproxy.ContextDialer); ok {
			return cd.DialContext(ctx, "tcp", target)
		}
		return d.Dial("tcp", target)
	}

	// HTTP(S) upstream: CONNECT through it
	dialer := &net.Dialer{Timeout: 15 * time.Second}
	conn, err := dialer.DialContext(ctx, "tcp", upstreamAddr(u))
	if err != nil {
		return nil, err
	}
	var b strings.Builder
	fmt.Fprintf(&b, "CONNECT %s HTTP/1.1\r\nHost: %s\r\n", target, target)
	if u.Username != "" {
		cred := base64.StdEncoding.EncodeToString([]byte(u.Username + ":" + u.Password))
		fmt.Fprintf(&b, "Proxy-Authorization: Basic %s\r\n", cred)
	}
	b.WriteString("\r\n")
	if _, err := conn.Write([]byte(b.String())); err != nil {
		conn.Close()
		return nil, err
	}
	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, &http.Request{Method: http.MethodConnect})
	if err != nil {
		conn.Close()
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		conn.Close()
		return nil, fmt.Errorf("upstream CONNECT status %d", resp.StatusCode)
	}
	return conn, nil
}

type upstreamResult struct {
	StatusCode    int
	ResponseBytes int64
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	bytes      int64
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *responseRecorder) Write(body []byte) (int, error) {
	if r.statusCode == 0 {
		r.statusCode = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(body)
	r.bytes += int64(n)
	return n, err
}

func (g *Gateway) handleConnect(w http.ResponseWriter, r *http.Request, u pool.Upstream) (upstreamResult, error) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	upConn, err := dialThroughUpstream(ctx, u, r.Host)
	if err != nil {
		return upstreamResult{}, err
	}
	defer upConn.Close()

	hj, ok := w.(http.Hijacker)
	if !ok {
		return upstreamResult{}, fmt.Errorf("hijacking not supported")
	}
	clientConn, _, err := hj.Hijack()
	if err != nil {
		return upstreamResult{}, err
	}
	defer clientConn.Close()

	if _, err := clientConn.Write([]byte("HTTP/1.1 200 Connection established\r\n\r\n")); err != nil {
		return upstreamResult{}, err
	}

	done := make(chan struct{}, 2)
	go func() { io.Copy(upConn, clientConn); done <- struct{}{} }()
	go func() { io.Copy(clientConn, upConn); done <- struct{}{} }()
	<-done
	return upstreamResult{StatusCode: http.StatusOK}, nil
}

func (g *Gateway) handleHTTP(w http.ResponseWriter, r *http.Request, u pool.Upstream) (upstreamResult, error) {
	recorder := &responseRecorder{ResponseWriter: w}
	transport := &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 15 * time.Second}).DialContext,
		ResponseHeaderTimeout: 45 * time.Second,
	}
	if isSocks(u) {
		var auth *xproxy.Auth
		if u.Username != "" {
			auth = &xproxy.Auth{User: u.Username, Password: u.Password}
		}
		d, err := xproxy.SOCKS5("tcp", upstreamAddr(u), auth, xproxy.Direct)
		if err != nil {
			return upstreamResult{}, err
		}
		if cd, ok := d.(xproxy.ContextDialer); ok {
			transport.DialContext = cd.DialContext
		}
	} else {
		up := &url.URL{Scheme: "http", Host: upstreamAddr(u)}
		if u.Username != "" {
			up.User = url.UserPassword(u.Username, u.Password)
		}
		transport.Proxy = http.ProxyURL(up)
	}

	outReq := r.Clone(r.Context())
	outReq.RequestURI = ""
	for _, h := range hopHeaders {
		outReq.Header.Del(h)
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   60 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	resp, err := client.Do(outReq)
	if err != nil {
		return upstreamResult{}, err
	}
	defer resp.Body.Close()

	for k, vv := range resp.Header {
		for _, v := range vv {
			recorder.Header().Add(k, v)
		}
	}
	recorder.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(recorder, resp.Body); err != nil {
		return upstreamResult{StatusCode: resp.StatusCode, ResponseBytes: recorder.bytes}, err
	}
	return upstreamResult{StatusCode: recorder.statusCode, ResponseBytes: recorder.bytes}, nil
}

func withoutUpstreamID(candidates []pool.Upstream, id int64) []pool.Upstream {
	out := make([]pool.Upstream, 0, len(candidates))
	for _, candidate := range candidates {
		if candidate.ID == id {
			continue
		}
		out = append(out, candidate)
	}
	return out
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func lastErrorMessage(err error) string {
	if err == nil {
		return "unknown"
	}
	return err.Error()
}

func targetDetails(r *http.Request) (string, int64, string) {
	if r.Method == http.MethodConnect {
		host, port := splitHostPort(r.Host)
		return host, int64(port), "tcp"
	}

	host := r.URL.Hostname()
	portText := r.URL.Port()
	scheme := r.URL.Scheme
	if host == "" {
		host, _ = splitHostPort(r.Host)
	}
	if scheme == "" {
		scheme = "http"
	}
	port := 0
	if portText != "" {
		port, _ = strconv.Atoi(portText)
	}
	if port == 0 {
		if scheme == "https" {
			port = 443
		} else {
			port = 80
		}
	}
	return host, int64(port), scheme
}

func splitHostPort(value string) (string, int) {
	if value == "" {
		return "", 0
	}
	host, portText, err := net.SplitHostPort(value)
	if err == nil {
		port, _ := strconv.Atoi(portText)
		return host, port
	}
	return value, 0
}

func (g *Gateway) recordUsage(event usage.Event) {
	if g.usage == nil {
		return
	}
	g.usage.Record(event)
}

func cfgTeamID(cfg *pool.ListConfig) int64 {
	if cfg == nil {
		return 0
	}
	return cfg.TeamID
}
