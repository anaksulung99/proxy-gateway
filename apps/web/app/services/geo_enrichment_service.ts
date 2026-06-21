import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'

interface GeoInfo {
  countryCode: string | null
  asn: number | null
}

interface EntryRow {
  id: number
  returned_ip: string
}

const ASN_RE = /^AS(\d+)/i
const IPAPI_BATCH = 'http://ip-api.com/batch?fields=status,countryCode,as,query'
const CHUNK = 100

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Populates proxy_entries.country_code + asn_number from each proxy's exit IP
 * (returned_ip) so the gateway's geo-targeting / exclude-country / exclude-ASN
 * filters actually work. Uses the free ip-api.com batch endpoint (100 IPs per
 * call). Runs inline right after a health check and on a periodic backfill for
 * entries checked via the async (RabbitMQ) path.
 */
export class GeoEnrichmentService {
  private timer: NodeJS.Timeout | null = null
  private started = false
  private running = false

  start() {
    if (this.started || !this.isEnabled()) return
    const intervalSeconds = this.tickSeconds()
    this.started = true
    this.timer = setInterval(() => void this.tick(), intervalSeconds * 1000)
    logger.info({ intervalSeconds, batchLimit: this.batchLimit() }, 'geo enrichment started')
    void this.tick()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.started = false
  }

  isEnabled() {
    return env.get('NODE_ENV') !== 'test' && env.get('GEO_ENRICHMENT_ENABLED', true) === true
  }

  tickSeconds() {
    // Default 30s so freshly async-checked (scraped/imported) proxies get their
    // country/ASN within ~30s — practically instant for the workflow — while
    // staying well under ip-api's batch rate limit (~4 req/min at this cadence).
    const v = Number(env.get('GEO_ENRICHMENT_TICK_SECONDS', 30))
    return Number.isFinite(v) ? Math.max(Math.floor(v), 15) : 30
  }

  batchLimit() {
    const v = Number(env.get('GEO_ENRICHMENT_BATCH_LIMIT', 200))
    return Number.isFinite(v) ? Math.min(Math.max(Math.floor(v), 1), 1000) : 200
  }

  async tick() {
    if (this.running) return 0
    this.running = true
    try {
      return await this.enrichPending(this.batchLimit())
    } catch (error) {
      logger.warn({ err: error }, 'geo enrichment tick failed')
      return 0
    } finally {
      this.running = false
    }
  }

  /** Resolve a set of IPs to {countryCode, asn} via ip-api batch (chunked). */
  async resolveBatch(ips: string[]): Promise<Map<string, GeoInfo>> {
    const out = new Map<string, GeoInfo>()
    const unique = [...new Set(ips.filter(Boolean))]

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK)
      try {
        const resp = await fetch(IPAPI_BATCH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        })
        if (!resp.ok) {
          logger.warn({ status: resp.status }, 'ip-api batch responded non-200')
          continue
        }
        const arr = (await resp.json()) as Array<{
          status: string
          countryCode?: string
          as?: string
          query: string
        }>
        for (const r of arr) {
          if (r.status !== 'success') continue
          const m = ASN_RE.exec(r.as ?? '')
          out.set(r.query, {
            countryCode: r.countryCode ? r.countryCode.toUpperCase() : null,
            asn: m ? Number(m[1]) : null,
          })
        }
      } catch (err) {
        logger.warn({ err }, 'ip-api batch request failed')
      }
      // Stay well under ip-api's 15 req/min free limit.
      if (i + CHUNK < unique.length) await sleep(1500)
    }
    return out
  }

  /** Enrich specific entries (by id) that already have an exit IP. */
  async enrichByIds(entryIds: number[]): Promise<number> {
    if (entryIds.length === 0) return 0
    const rows = await db
      .from('proxy_entries')
      .whereIn('id', entryIds)
      .whereNotNull('returned_ip')
      .select('id', 'returned_ip')
    return this.applyToRows(rows)
  }

  /** Backfill: healthy entries that have an exit IP but no country yet. */
  async enrichPending(limit: number): Promise<number> {
    const rows = await db
      .from('proxy_entries')
      .whereNotNull('returned_ip')
      .whereNull('country_code')
      .orderBy('last_checked_at', 'desc')
      .limit(limit)
      .select('id', 'returned_ip')
    return this.applyToRows(rows)
  }

  private async applyToRows(rows: EntryRow[]): Promise<number> {
    if (rows.length === 0) return 0
    const geo = await this.resolveBatch(rows.map((r) => r.returned_ip))
    let updated = 0

    await db.transaction(async (trx) => {
      for (const row of rows) {
        const g = geo.get(row.returned_ip)
        if (!g || (!g.countryCode && !g.asn)) continue
        await trx
          .from('proxy_entries')
          .where('id', row.id)
          .update({ country_code: g.countryCode, asn_number: g.asn, updated_at: new Date() })
        updated++
      }
    })

    if (updated > 0) logger.info({ updated }, 'geo enrichment applied')
    return updated
  }
}

export default new GeoEnrichmentService()
