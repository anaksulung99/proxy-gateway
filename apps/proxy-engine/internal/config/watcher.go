package config

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/joho/godotenv"
	pkgconfig "github.com/proxy-system/proxy-engine/pkg/config"
	"github.com/rs/zerolog"
)

type Watcher struct {
	log       zerolog.Logger
	interval  time.Duration
	envFiles  []string
	lastState string
}

func NewWatcher(log zerolog.Logger, interval time.Duration) *Watcher {
	if interval <= 0 {
		interval = 5 * time.Second
	}

	return &Watcher{
		log:      log,
		interval: interval,
		envFiles: discoverEnvFiles(),
	}
}

func (w *Watcher) Enabled() bool {
	return len(w.envFiles) > 0
}

func (w *Watcher) Start(ctx context.Context, onChange func(*pkgconfig.Config)) {
	if !w.Enabled() {
		w.log.Info().Msg("config watcher disabled: no .env files discovered")
		return
	}

	initial, fingerprint, err := w.load()
	if err != nil {
		w.log.Warn().Err(err).Msg("config watcher initial load failed")
	} else {
		w.lastState = fingerprint
		if onChange != nil {
			onChange(initial)
		}
	}

	w.log.Info().
		Strs("env_files", w.envFiles).
		Dur("interval", w.interval).
		Msg("config watcher started")

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.log.Info().Msg("config watcher stopped")
			return
		case <-ticker.C:
			cfg, fingerprint, err := w.load()
			if err != nil {
				w.log.Warn().Err(err).Msg("config watcher reload failed")
				continue
			}
			if fingerprint == w.lastState {
				continue
			}

			w.lastState = fingerprint
			if onChange != nil {
				onChange(cfg)
			}
		}
	}
}

func (w *Watcher) load() (*pkgconfig.Config, string, error) {
	values := map[string]string{}
	parts := make([]string, 0, len(w.envFiles))

	for _, path := range w.envFiles {
		stat, err := os.Stat(path)
		if err != nil {
			return nil, "", err
		}

		envMap, err := godotenv.Read(path)
		if err != nil {
			return nil, "", err
		}
		for key, value := range envMap {
			values[key] = value
		}

		parts = append(parts, path+"|"+stat.ModTime().UTC().Format(time.RFC3339Nano))
	}

	return pkgconfig.LoadFromMap(values), strings.Join(parts, ";"), nil
}

func discoverEnvFiles() []string {
	cwd, err := os.Getwd()
	if err != nil {
		return nil
	}

	candidates := []string{
		filepath.Join(cwd, ".env"),
		filepath.Join(cwd, "..", "..", ".env"),
	}

	seen := map[string]struct{}{}
	files := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		path := filepath.Clean(candidate)
		if _, exists := seen[path]; exists {
			continue
		}
		if _, err := os.Stat(path); err == nil {
			seen[path] = struct{}{}
			files = append(files, path)
		}
	}
	return files
}
