/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),

  // Mail
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USER: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  SMTP_FROM_NAME: Env.schema.string.optional(),
  SMTP_FROM_EMAIL: Env.schema.string.optional(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database (PostgreSQL)
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  // Redis
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  // Health-check enqueue (RabbitMQ). Disabled by default until the Go
  // health-checker service is running (Phase 3).
  HEALTHCHECK_ENQUEUE_ENABLED: Env.schema.boolean.optional(),
  RABBITMQ_URL: Env.schema.string.optional(),
  RABBITMQ_HOST: Env.schema.string.optional(),
  RABBITMQ_PORT: Env.schema.number.optional(),
  RABBITMQ_USER: Env.schema.string.optional(),
  RABBITMQ_PASSWORD: Env.schema.string.optional(),
  RABBITMQ_VHOST: Env.schema.string.optional(),

  // Go health-checker service (synchronous HTTP API)
  HEALTH_CHECKER_URL: Env.schema.string.optional(),
  HEALTH_CHECKER_TARGET_URL: Env.schema.string.optional(),

  // Go scraper service
  SCRAPER_URL: Env.schema.string.optional(),
  SCRAPER_SCHEDULER_ENABLED: Env.schema.boolean.optional(),
  SCRAPER_SCHEDULER_TICK_SECONDS: Env.schema.number.optional(),
  PROXY_USAGE_PRUNER_ENABLED: Env.schema.boolean.optional(),
  PROXY_USAGE_PRUNER_TICK_SECONDS: Env.schema.number.optional(),
  PROXY_USAGE_LOG_RETENTION_DAYS: Env.schema.number.optional(),

  // Proxy engine gateway (shown to users as a connection string)
  GATEWAY_HOST: Env.schema.string.optional(),
  GATEWAY_SOCKS_HOST: Env.schema.string.optional(),
  GATEWAY_SECRET: Env.schema.string.optional(),
  PROXY_ENGINE_ADMIN_URL: Env.schema.string.optional(),
  INTERNAL_API_SECRET: Env.schema.string.optional(),
})
