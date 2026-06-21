package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/proxy-system/proxy-engine/pkg/config"
	amqp "github.com/rabbitmq/amqp091-go"
)

// Client is a lazy, self-healing AMQP publisher. It dials on first use and
// transparently re-dials whenever the connection is missing or has dropped, so
// a broker that is slow to start at boot or restarts mid-life never permanently
// disables publishing (previously a failed boot-time dial silently disabled the
// runtime auto-recheck feature for the lifetime of the process).
type Client struct {
	cfg  config.RabbitMQConfig
	mu   sync.Mutex
	conn *amqp.Connection
}

// NewClient returns a publisher without connecting. The connection is
// established lazily on the first PublishJSON call.
func NewClient(cfg config.RabbitMQConfig) *Client {
	return &Client{cfg: cfg}
}

func (c *Client) dsn() string {
	return fmt.Sprintf("amqp://%s:%s@%s:%s/%s",
		c.cfg.User, c.cfg.Password, c.cfg.Host, c.cfg.Port, c.cfg.VHost)
}

// connection returns a live connection, re-dialing if the cached one is nil or
// closed.
func (c *Client) connection() (*amqp.Connection, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil && !c.conn.IsClosed() {
		return c.conn, nil
	}
	conn, err := amqp.Dial(c.dsn())
	if err != nil {
		return nil, fmt.Errorf("rabbitmq connection failed: %w", err)
	}
	c.conn = conn
	return conn, nil
}

// reset drops the cached connection so the next publish re-dials.
func (c *Client) reset() {
	c.mu.Lock()
	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
	}
	c.mu.Unlock()
}

func (c *Client) PublishJSON(ctx context.Context, queue string, payload any) error {
	if c == nil {
		return fmt.Errorf("rabbitmq client is not initialized")
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("rabbitmq marshal failed: %w", err)
	}

	conn, err := c.connection()
	if err != nil {
		return err
	}

	ch, err := conn.Channel()
	if err != nil {
		c.reset() // connection is likely dead — force a fresh dial next time
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
	c.mu.Lock()
	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
	}
	c.mu.Unlock()
}
