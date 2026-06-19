import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export class ProxyUsageRetentionService {
  private timer: NodeJS.Timeout | null = null
  private started = false
  private pruning = false

  start() {
    if (this.started || !this.isEnabled()) return

    const intervalSeconds = this.tickSeconds()
    this.started = true
    this.timer = setInterval(() => void this.tick(), intervalSeconds * 1000)
    logger.info({ intervalSeconds, retentionDays: this.retentionDays() }, 'proxy usage retention started')
    void this.tick()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
  }

  isEnabled() {
    return env.get('NODE_ENV') !== 'test' && env.get('PROXY_USAGE_PRUNER_ENABLED', true) === true
  }

  retentionDays() {
    return this.normalizeRetentionDays(env.get('PROXY_USAGE_LOG_RETENTION_DAYS', 30))
  }

  tickSeconds() {
    return this.normalizeTickSeconds(env.get('PROXY_USAGE_PRUNER_TICK_SECONDS', 3600))
  }

  normalizeRetentionDays(value: number) {
    if (!Number.isFinite(value)) return 30
    return Math.max(Math.floor(value), 1)
  }

  normalizeTickSeconds(value: number) {
    if (!Number.isFinite(value)) return 3600
    return Math.max(Math.floor(value), 300)
  }

  cutoffFor(now: DateTime = DateTime.now()) {
    return now.minus({ days: this.retentionDays() }).toUTC()
  }

  async tick(now = DateTime.now()) {
    if (this.pruning) return 0
    this.pruning = true

    try {
      const cutoff = this.cutoffFor(now)
      const deletedRows = await db
        .from('proxy_usage_logs')
        .where('requested_at', '<', cutoff.toSQL()!)
        .delete()
      const deletedCount = Array.isArray(deletedRows) ? deletedRows.length : Number(deletedRows ?? 0)

      if (deletedCount > 0) {
        logger.info({ deletedRows: deletedCount, cutoff: cutoff.toISO() }, 'proxy usage logs pruned')
      }

      return deletedCount
    } catch (error) {
      logger.error({ err: error }, 'proxy usage retention failed')
      return 0
    } finally {
      this.pruning = false
    }
  }
}

export default new ProxyUsageRetentionService()
