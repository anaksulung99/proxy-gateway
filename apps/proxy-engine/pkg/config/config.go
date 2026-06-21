package config

import (
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
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
	viper.AutomaticEnv()
	viper.SetDefault("GO_ENV", "development")
	viper.SetDefault("PORT", "8001")
	viper.SetDefault("GATEWAY_PORT", "8000")
	viper.SetDefault("SOCKS_PORT", "1080")
	viper.SetDefault("GATEWAY_SECRET", "changeme")
	viper.SetDefault("WORKERS", 50)
	viper.SetDefault("RUNTIME_FAILURE_THRESHOLD", 2)
	viper.SetDefault("RUNTIME_FAILURE_WINDOW_SEC", 300)
	viper.SetDefault("RUNTIME_AUTO_RECHECK_ENABLED", true)
	viper.SetDefault("RUNTIME_AUTO_RECHECK_DELAY_SEC", 90)
	viper.SetDefault("RUNTIME_AUTO_RECHECK_MAX_ATTEMPTS", 2)
	viper.SetDefault("RUNTIME_AUTO_RECHECK_RETRY_DELAY_SEC", 180)
	viper.SetDefault("REDIS_HOST", "127.0.0.1")
	viper.SetDefault("REDIS_PORT", "6379")
	viper.SetDefault("DB_HOST", "127.0.0.1")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("RABBITMQ_HOST", "127.0.0.1")
	viper.SetDefault("RABBITMQ_PORT", "5672")
	viper.SetDefault("RABBITMQ_USER", "guest")
	viper.SetDefault("RABBITMQ_PASSWORD", "guest")
	viper.SetDefault("RABBITMQ_VHOST", "/proxy")

	return &Config{
		Env:                        viper.GetString("GO_ENV"),
		Port:                       viper.GetString("PORT"),
		GatewayPort:                viper.GetString("GATEWAY_PORT"),
		SocksPort:                  viper.GetString("SOCKS_PORT"),
		GatewaySecret:              viper.GetString("GATEWAY_SECRET"),
		Workers:                    viper.GetInt("WORKERS"),
		InternalSecret:             viper.GetString("INTERNAL_API_SECRET"),
		RuntimeFailureThreshold:    viper.GetInt("RUNTIME_FAILURE_THRESHOLD"),
		RuntimeFailureWindowSec:    viper.GetInt("RUNTIME_FAILURE_WINDOW_SEC"),
		RuntimeAutoRecheckEnabled:  viper.GetBool("RUNTIME_AUTO_RECHECK_ENABLED"),
		RuntimeAutoRecheckDelaySec: viper.GetInt("RUNTIME_AUTO_RECHECK_DELAY_SEC"),
		RuntimeAutoRecheckMax:      viper.GetInt("RUNTIME_AUTO_RECHECK_MAX_ATTEMPTS"),
		RuntimeAutoRetryDelaySec:   viper.GetInt("RUNTIME_AUTO_RECHECK_RETRY_DELAY_SEC"),
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
		},
		Postgres: PostgresConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			Database: viper.GetString("DB_DATABASE"),
		},
		RabbitMQ: RabbitMQConfig{
			Host:     viper.GetString("RABBITMQ_HOST"),
			Port:     viper.GetString("RABBITMQ_PORT"),
			User:     viper.GetString("RABBITMQ_USER"),
			Password: viper.GetString("RABBITMQ_PASSWORD"),
			VHost:    viper.GetString("RABBITMQ_VHOST"),
		},
	}
}
