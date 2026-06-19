import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export interface ScrapedProxy {
  host: string
  port: string
  protocol: string
  country: string
}

export interface ScrapeResult {
  bySource: Record<string, { count: number; error?: string }>
  total: number
  proxies: ScrapedProxy[]
}

function baseUrl(): string {
  return env.get('SCRAPER_URL', 'http://127.0.0.1:8002')
}

/**
 * Client for the Go scraper service. Triggers source adapters and returns the
 * scraped proxies (no persistence here — the controller imports them).
 */
export class ScraperClientService {
  async listSources(): Promise<string[]> {
    try {
      const resp = await fetch(`${baseUrl()}/sources`)
      if (!resp.ok) return []
      const data = (await resp.json()) as { sources: string[] }
      return data.sources ?? []
    } catch (err) {
      logger.error({ err }, 'scraper /sources failed')
      return []
    }
  }

  async scrape(sources: string[]): Promise<ScrapeResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120_000)
    try {
      const resp = await fetch(`${baseUrl()}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ sources }),
      })
      if (!resp.ok) throw new Error(`scraper responded ${resp.status}`)
      return (await resp.json()) as ScrapeResult
    } catch (err) {
      logger.error({ err }, 'scraper /scrape failed')
      throw new Error('Scraper service is unreachable (is it running on :8002?)')
    } finally {
      clearTimeout(timer)
    }
  }
}

export default new ScraperClientService()
