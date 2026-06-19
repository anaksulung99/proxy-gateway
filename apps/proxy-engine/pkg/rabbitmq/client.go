package rabbitmq

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/proxy-system/proxy-engine/pkg/config"
)

type Client struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewClient(cfg config.RabbitMQConfig) (*Client, error) {
	dsn := fmt.Sprintf("amqp://%s:%s@%s:%s/%s",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.VHost)

	conn, err := amqp.Dial(dsn)
	if err != nil {
		return nil, fmt.Errorf("rabbitmq connection failed: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("rabbitmq channel failed: %w", err)
	}

	return &Client{conn: conn, channel: ch}, nil
}

func (c *Client) Channel() *amqp.Channel {
	return c.channel
}

func (c *Client) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
