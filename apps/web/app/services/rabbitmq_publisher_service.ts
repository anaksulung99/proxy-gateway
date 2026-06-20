import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export type HealthCheckMode = 'request' | 'playwright' | 'crawlee'

export interface HealthCheckJob {
  proxyEntryId: number
  runId?: number | null
  host: string
  port: number
  protocol: string
  username?: string | null
  password?: string | null
  mode: HealthCheckMode
}

const HEALTHCHECK_QUEUE = 'healthcheck.jobs'

/**
 * Thin publisher for the RabbitMQ work queues consumed by the Go services.
 *
 * It is intentionally fail-soft: when enqueue is disabled (default until the
 * Go health-checker is online in Phase 3) or the broker is unreachable, it
 * logs and returns `enqueued: 0` instead of throwing — so the web app keeps
 * working without RabbitMQ during local development.
 */
export class RabbitmqPublisherService {
  isEnabled(): boolean {
    return env.get('HEALTHCHECK_ENQUEUE_ENABLED', false) === true
  }

  /**
   * Object-form connection options — avoids URL-encoding issues when the
   * password contains reserved characters like `@`.
   */
  connectionConfig() {
    return {
      protocol: 'amqp',
      hostname: env.get('RABBITMQ_HOST', '127.0.0.1'),
      port: Number(env.get('RABBITMQ_PORT', 5672)),
      username: env.get('RABBITMQ_USER', 'guest'),
      password: env.get('RABBITMQ_PASSWORD', 'guest'),
      vhost: env.get('RABBITMQ_VHOST', '/'),
      heartbeat: 30,
    }
  }

  async enqueueHealthChecks(jobs: HealthCheckJob[]): Promise<{ enqueued: number }> {
    if (jobs.length === 0) return { enqueued: 0 }

    if (!this.isEnabled()) {
      logger.debug({ count: jobs.length }, 'healthcheck enqueue disabled — skipping')
      return { enqueued: 0 }
    }

    try {
      const amqp: any = await import('amqplib')
      const connect = amqp.connect ?? amqp.default?.connect
      const conn = await connect(this.connectionConfig())
      const ch = await conn.createChannel()
      await ch.assertQueue(HEALTHCHECK_QUEUE, { durable: true })

      for (const job of jobs) {
        ch.sendToQueue(HEALTHCHECK_QUEUE, Buffer.from(JSON.stringify(job)), {
          persistent: true,
        })
      }

      await ch.close()
      await conn.close()
      logger.info({ count: jobs.length }, 'enqueued health-check jobs')
      return { enqueued: jobs.length }
    } catch (error) {
      logger.error({ err: error }, 'failed to enqueue health-check jobs (broker unreachable?)')
      return { enqueued: 0 }
    }
  }
}

export default new RabbitmqPublisherService()
