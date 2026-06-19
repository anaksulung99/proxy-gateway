package config

import (
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	Env      string
	Port     string
	Workers  int
	Redis    RedisConfig
	Postgres PostgresConfig
	RabbitMQ RabbitMQConfig
}

type RedisConfig    struct{ Host, Port, Password string }
type PostgresConfig struct{ Host, Port, User, Password, Database string }
type RabbitMQConfig struct{ Host, Port, User, Password, VHost string }

func Load() *Config {
	_ = godotenv.Load()
	viper.AutomaticEnv()
	viper.SetDefault("GO_ENV", "development")
	viper.SetDefault("PORT", "8002")
	viper.SetDefault("WORKERS", 20)
	viper.SetDefault("REDIS_HOST", "redis")
	viper.SetDefault("REDIS_PORT", "6379")
	viper.SetDefault("DB_HOST", "postgres")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("RABBITMQ_HOST", "rabbitmq")
	viper.SetDefault("RABBITMQ_PORT", "5672")
	viper.SetDefault("RABBITMQ_VHOST", "proxysystem")

	return &Config{
		Env:     viper.GetString("GO_ENV"),
		Port:    viper.GetString("PORT"),
		Workers: viper.GetInt("WORKERS"),
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
