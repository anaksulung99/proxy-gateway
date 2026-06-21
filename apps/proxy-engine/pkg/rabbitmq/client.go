package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/proxy-system/proxy-engine/pkg/config"
	amqp "github.com/rabbitmq/amqp091-go"
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

func (c *Client) PublishJSON(ctx context.Context, queue string, payload any) error {
	if c == nil || c.conn == nil {
		return fmt.Errorf("rabbitmq client is not initialized")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("rabbitmq marshal failed: %w", err)
	}

	ch, err := c.conn.Channel()
	if err != nil {
		return fmt.Errorf("rabbitmq publish channel failed: %w", err)
	}
	defer ch.Close()

	if _, err := ch.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		return fmt.Errorf("rabbitmq queue declare failed: %w", err)
	}

	if err := ch.PublishWithContext(ctx, "", queue, false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        body,
	}); err != nil {
		return fmt.Errorf("rabbitmq publish failed: %w", err)
	}

	return nil
}

func (c *Client) Close() {
	if c.channel != nil {
		c.channel.Close()
	}
	if c.conn != nil {
		c.conn.Close()
	}
}
