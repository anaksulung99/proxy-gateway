package config

import (
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	Env            string
	Port           string // admin/health (Fiber)
	GatewayPort    string // forward-proxy listener
	GatewaySecret  string // password clients must present
	Workers        int
	InternalSecret string
	Redis          RedisConfig
	Postgres       PostgresConfig
	RabbitMQ       RabbitMQConfig
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
	viper.SetDefault("GATEWAY_SECRET", "changeme")
	viper.SetDefault("WORKERS", 50)
	viper.SetDefault("REDIS_HOST", "127.0.0.1")
	viper.SetDefault("REDIS_PORT", "6379")
	viper.SetDefault("DB_HOST", "127.0.0.1")
	viper.SetDefault("DB_PORT", "5432")

	return &Config{
		Env:            viper.GetString("GO_ENV"),
		Port:           viper.GetString("PORT"),
		GatewayPort:    viper.GetString("GATEWAY_PORT"),
		GatewaySecret:  viper.GetString("GATEWAY_SECRET"),
		Workers:        viper.GetInt("WORKERS"),
		InternalSecret: viper.GetString("INTERNAL_API_SECRET"),
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
