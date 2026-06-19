package rabbitmq

import (
	"fmt"
	"strconv"

	"github.com/proxy-system/health-checker/pkg/config"
	amqp "github.com/rabbitmq/amqp091-go"
)

type Client struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewClient(cfg config.RabbitMQConfig) (*Client, error) {
	port, _ := strconv.Atoi(cfg.Port)
	// Build via amqp.URI so reserved chars in the password (e.g. '@') are
	// encoded correctly — a raw fmt.Sprintf URL would break.
	uri := amqp.URI{
		Scheme:   "amqp",
		Host:     cfg.Host,
		Port:     port,
		Username: cfg.User,
		Password: cfg.Password,
		Vhost:    cfg.VHost,
	}

	conn, err := amqp.Dial(uri.String())
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
