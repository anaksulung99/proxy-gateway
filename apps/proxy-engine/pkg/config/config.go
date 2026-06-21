package config

import (
	"github.com/joho/godotenv"
	"os"
	"strconv"
)

type Config struct {
	Env                        string
	Port                       string // admin/health (Fiber)
	GatewayPort                string // HTTP forward-proxy listener
	SocksPort                  string // SOCKS5 inbound listener
	GatewaySecret              string // password clients must present
	Workers                    int
	InternalSecret             string
	RuntimeFailureThreshold    int
	RuntimeFailureWindowSec    int
	RuntimeAutoRecheckEnabled  bool
	RuntimeAutoRecheckDelaySec int
	RuntimeAutoRecheckMax      int
	RuntimeAutoRetryDelaySec   int
	Redis                      RedisConfig
	Postgres                   PostgresConfig
	RabbitMQ                   RabbitMQConfig
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
}

type PostgresConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
}

type RabbitMQConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	VHost    string
}

func Load() *Config {
	_ = godotenv.Load()
	return loadFromLookup(os.LookupEnv)
}

func LoadFromMap(values map[string]string) *Config {
	return loadFromLookup(func(key string) (string, bool) {
		if value, ok := values[key]; ok {
			return value, true
		}
		return os.LookupEnv(key)
	})
}

func loadFromLookup(lookup func(string) (string, bool)) *Config {
	return &Config{
		Env:                        getString(lookup, "GO_ENV", "development"),
		Port:                       getString(lookup, "PORT", "8001"),
		GatewayPort:                getString(lookup, "GATEWAY_PORT", "8000"),
		SocksPort:                  getString(lookup, "SOCKS_PORT", "1080"),
		GatewaySecret:              getString(lookup, "GATEWAY_SECRET", "changeme"),
		Workers:                    getInt(lookup, "WORKERS", 50),
		InternalSecret:             getString(lookup, "INTERNAL_API_SECRET", ""),
		RuntimeFailureThreshold:    getInt(lookup, "RUNTIME_FAILURE_THRESHOLD", 2),
		RuntimeFailureWindowSec:    getInt(lookup, "RUNTIME_FAILURE_WINDOW_SEC", 300),
		RuntimeAutoRecheckEnabled:  getBool(lookup, "RUNTIME_AUTO_RECHECK_ENABLED", true),
		RuntimeAutoRecheckDelaySec: getInt(lookup, "RUNTIME_AUTO_RECHECK_DELAY_SEC", 90),
		RuntimeAutoRecheckMax:      getInt(lookup, "RUNTIME_AUTO_RECHECK_MAX_ATTEMPTS", 2),
		RuntimeAutoRetryDelaySec:   getInt(lookup, "RUNTIME_AUTO_RECHECK_RETRY_DELAY_SEC", 180),
		Redis: RedisConfig{
			Host:     getString(lookup, "REDIS_HOST", "127.0.0.1"),
			Port:     getString(lookup, "REDIS_PORT", "6379"),
			Password: getString(lookup, "REDIS_PASSWORD", ""),
		},
		Postgres: PostgresConfig{
			Host:     getString(lookup, "DB_HOST", "127.0.0.1"),
			Port:     getString(lookup, "DB_PORT", "5432"),
			User:     getString(lookup, "DB_USER", ""),
			Password: getString(lookup, "DB_PASSWORD", ""),
			Database: getString(lookup, "DB_DATABASE", ""),
		},
		RabbitMQ: RabbitMQConfig{
			Host:     getString(lookup, "RABBITMQ_HOST", "127.0.0.1"),
			Port:     getString(lookup, "RABBITMQ_PORT", "5672"),
			User:     getString(lookup, "RABBITMQ_USER", "guest"),
			Password: getString(lookup, "RABBITMQ_PASSWORD", "guest"),
			VHost:    getString(lookup, "RABBITMQ_VHOST", "/proxy"),
		},
	}
}

func getString(lookup func(string) (string, bool), key string, fallback string) string {
	if value, ok := lookup(key); ok && value != "" {
		return value
	}
	return fallback
}

func getInt(lookup func(string) (string, bool), key string, fallback int) int {
	value, ok := lookup(key)
	if !ok || value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func getBool(lookup func(string) (string, bool), key string, fallback bool) bool {
	value, ok := lookup(key)
	if !ok || value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
