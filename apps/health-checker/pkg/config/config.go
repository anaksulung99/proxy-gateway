package config

import (
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	Env             string
	Port            string
	Workers         int
	TimeoutSeconds  int
	BrowserPool     int
	TestURL         string
	ConsumerEnabled bool
	Redis           RedisConfig
	Postgres        PostgresConfig
	RabbitMQ        RabbitMQConfig
}

type RedisConfig struct{ Host, Port, Password string }
type PostgresConfig struct{ Host, Port, User, Password, Database string }
type RabbitMQConfig struct{ Host, Port, User, Password, VHost string }

func Load() *Config {
	// Load a local .env if present (no-op in containers / when vars are set).
	_ = godotenv.Load()

	viper.AutomaticEnv()
	viper.SetDefault("GO_ENV", "development")
	viper.SetDefault("PORT", "8003")
	viper.SetDefault("WORKERS", 50)
	viper.SetDefault("CHECKER_TIMEOUT_SECONDS", 15)
	viper.SetDefault("CHECKER_BROWSER_POOL_SIZE", 5)
	viper.SetDefault("CHECKER_TEST_URL", "https://api.ipify.org")
	viper.SetDefault("CONSUMER_ENABLED", false)
	viper.SetDefault("DB_HOST", "127.0.0.1")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("RABBITMQ_PORT", "5672")
	viper.SetDefault("RABBITMQ_VHOST", "/")

	return &Config{
		Env:             viper.GetString("GO_ENV"),
		Port:            viper.GetString("PORT"),
		Workers:         viper.GetInt("WORKERS"),
		TimeoutSeconds:  viper.GetInt("CHECKER_TIMEOUT_SECONDS"),
		BrowserPool:     viper.GetInt("CHECKER_BROWSER_POOL_SIZE"),
		TestURL:         viper.GetString("CHECKER_TEST_URL"),
		ConsumerEnabled: viper.GetBool("CONSUMER_ENABLED"),
		Redis: RedisConfig{
			Host: viper.GetString("REDIS_HOST"), Port: viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
		},
		Postgres: PostgresConfig{
			Host: viper.GetString("DB_HOST"), Port: viper.GetString("DB_PORT"),
			User: viper.GetString("DB_USER"), Password: viper.GetString("DB_PASSWORD"),
			Database: viper.GetString("DB_DATABASE"),
		},
		RabbitMQ: RabbitMQConfig{
			Host: viper.GetString("RABBITMQ_HOST"), Port: viper.GetString("RABBITMQ_PORT"),
			User: viper.GetString("RABBITMQ_USER"), Password: viper.GetString("RABBITMQ_PASSWORD"),
			VHost: viper.GetString("RABBITMQ_VHOST"),
		},
	}
}
