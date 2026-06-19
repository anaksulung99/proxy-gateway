import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import ProxyList from '#models/proxy_list'
import ScraperSource from '#models/scraper_source'
import scraperPipeline from '#services/scraper_pipeline_service'
import { DateTime } from 'luxon'

type CronPart = {
  expression: string
  min: number
  max: number
  normalize?: (value: number) => number
}

export class ScraperSchedulerService {
  private timer: NodeJS.Timeout | null = null
  private started = false
  private ticking = false
  private activeSources = new Set<number>()

  start() {
    if (this.started || !this.isEnabled()) return

    const intervalSeconds = Math.max(env.get('SCRAPER_SCHEDULER_TICK_SECONDS', 30), 15)
    this.started = true
    this.timer = setInterval(() => void this.tick(), intervalSeconds * 1000)
    logger.info({ intervalSeconds }, 'scraper scheduler started')
    void this.tick()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
  }

  isEnabled() {
    return env.get('NODE_ENV') !== 'test' && env.get('SCRAPER_SCHEDULER_ENABLED', true) === true
  }

  cronMatches(scheduleCron: string, date: DateTime) {
    const parts = scheduleCron.trim().split(/\s+/)
    if (parts.length !== 5) return false

    const definitions: CronPart[] = [
      { expression: parts[0], min: 0, max: 59 },
      { expression: parts[1], min: 0, max: 23 },
      { expression: parts[2], min: 1, max: 31 },
      { expression: parts[3], min: 1, max: 12 },
      {
        expression: parts[4],
        min: 0,
        max: 7,
        normalize: (value) => (value === 7 ? 0 : value),
      },
    ]

    const values = [date.minute, date.hour, date.day, date.month, date.weekday % 7]
    return definitions.every((part, index) => this.matchField(part, values[index]))
  }

  isDue(scheduleCron: string | null, now: DateTime, lastRunAt: DateTime | null) {
    if (!scheduleCron || !this.cronMatches(scheduleCron, now)) return false
    return lastRunAt?.startOf('minute').toISO() !== now.startOf('minute').toISO()
  }

  async tick(now = DateTime.now()) {
    if (this.ticking) return
    this.ticking = true

    try {
      const sources = await ScraperSource.query()
        .where('is_enabled', true)
        .whereNotNull('proxy_list_id')
        .whereNotNull('schedule_cron')
        .orderBy('id', 'asc')

      if (sources.length === 0) return

      const listIds = [...new Set(sources.map((source) => source.proxyListId).filter(Boolean))] as number[]
      const lists = await ProxyList.query().whereIn('id', listIds)
      const listsById = new Map(lists.map((list) => [list.id, list]))

      for (const source of sources) {
        const targetList = source.proxyListId ? listsById.get(source.proxyListId) : null
        if (!targetList || !this.isDue(source.scheduleCron, now, source.lastRunAt)) continue
        if (this.activeSources.has(source.id)) continue

        this.activeSources.add(source.id)
        try {
          const summary = await scraperPipeline.runSource(source, targetList, {
            requestedMode: 'request',
            triggerType: 'scheduled',
          })
          logger.info(
            {
              sourceId: source.id,
              sourceKey: source.sourceKey,
              scrapedTotal: summary.scrapedTotal,
              created: summary.created,
              updated: summary.updated,
            },
            'scheduled scraper run completed'
          )
        } catch (error) {
          logger.error(
            { err: error, sourceId: source.id, sourceKey: source.sourceKey },
            'scheduled scraper run failed'
          )
        } finally {
          this.activeSources.delete(source.id)
        }
      }
    } finally {
      this.ticking = false
    }
  }

  private matchField(part: CronPart, currentValue: number) {
    const value = part.normalize ? part.normalize(currentValue) : currentValue
    return part.expression.split(',').some((segment) => this.matchSegment(segment, value, part))
  }

  private matchSegment(segment: string, value: number, part: CronPart) {
    const trimmed = segment.trim()
    if (!trimmed) return false

    const [rangeExpr, stepExpr] = trimmed.split('/')
    const step = stepExpr ? Number(stepExpr) : 1
    if (!Number.isInteger(step) || step < 1) return false

    if (rangeExpr === '*') {
      return (value - part.min) % step === 0
    }

    if (rangeExpr.includes('-')) {
      const [rawStart, rawEnd] = rangeExpr.split('-').map(Number)
      if (![rawStart, rawEnd].every(Number.isFinite)) return false
      const start = this.normalizeValue(rawStart, part)
      const end = this.normalizeValue(rawEnd, part)
      if (value < start || value > end) return false
      return (value - start) % step === 0
    }

    const exact = this.normalizeValue(Number(rangeExpr), part)
    if (!Number.isFinite(exact)) return false
    return value === exact
  }

  private normalizeValue(value: number, part: CronPart) {
    const normalized = part.normalize ? part.normalize(value) : value
    if (normalized < part.min || normalized > part.max) return Number.NaN
    return normalized
  }
}

export default new ScraperSchedulerService()
