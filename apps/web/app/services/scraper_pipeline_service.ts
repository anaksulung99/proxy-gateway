import ScraperSource from '#models/scraper_source'
import type ProxyList from '#models/proxy_list'
import ScraperRun from '#models/scraper_run'
import importService, { type ImportSummary } from '#services/proxy_import_service'
import scraperClient, {
  type ScrapeResult,
  type ScrapedProxy,
} from '#services/scraper_client_service'
import type { CheckMode } from '#services/health_check_client_service'
import { DateTime } from 'luxon'

export interface KnownSource {
  key: string
  name: string
}

export interface SourceRunSummary {
  runId: number
  sourceId: number
  sourceKey: string
  sourceName: string
  targetListId: number
  targetListName: string
  requestedMode: CheckMode
  triggerType: ScraperRunTrigger
  status: 'success' | 'error'
  scrapedTotal: number
  created: number
  updated: number
  invalid: number
  duplicatesInBatch: number
  enqueued: number
  bySource: Record<string, { count: number; error?: string }>
  finishedAt: string
  errorMessage?: string | null
}

export interface BatchRunSummary {
  requestedMode: CheckMode
  totalSources: number
  completedSources: number
  totalScraped: number
  totalCreated: number
  totalUpdated: number
  totalInvalid: number
  totalEnqueued: number
  results: SourceRunSummary[]
}

export type ScraperRunTrigger = 'manual' | 'batch' | 'scheduled'

export interface RunSourceOptions {
  requestedMode?: CheckMode
  triggerType?: ScraperRunTrigger
}

export function getSourceScrapeError(result: ScrapeResult, sourceKey: string) {
  const sourceResult = result.bySource[sourceKey]
  const message = typeof sourceResult?.error === 'string' ? sourceResult.error.trim() : ''
  return message || null
}

const KNOWN_SOURCES: KnownSource[] = [
  { key: 'proxyscrape', name: 'ProxyScrape' },
  { key: 'geonode', name: 'Geonode' },
  { key: 'free-proxy-list', name: 'Free Proxy List' },
  { key: 'us-proxy', name: 'US Proxy' },
  { key: 'ssl-proxies', name: 'SSL Proxies' },
  { key: 'openproxy-list', name: 'OpenProxyList' },
  { key: 'freeproxy-world', name: 'FreeProxy World' },
  { key: 'hide-mn', name: 'Hide.mn' },
  { key: 'proxy-daily', name: 'Proxy Daily' },
  { key: 'proxydb', name: 'ProxyDB' },
  { key: 'proxynova', name: 'ProxyNova' },
  { key: 'spys-one', name: 'Spys.one' },
]

export class ScraperPipelineService {
  getKnownSources() {
    return KNOWN_SOURCES
  }

  async provisionSources(teamId: number) {
    for (const source of KNOWN_SOURCES) {
      await ScraperSource.updateOrCreate({ teamId, sourceKey: source.key }, { name: source.name })
    }
  }

  buildImportBlob(proxies: ScrapedProxy[]) {
    return proxies.map((proxy) => `${proxy.protocol}://${proxy.host}:${proxy.port}`).join('\n')
  }

  cronLabel(scheduleCron: string | null) {
    const value = scheduleCron?.trim()
    return value ? value : 'Manual only'
  }

  serializeRun(run: ScraperRun) {
    return {
      id: run.id,
      scraperSourceId: run.scraperSourceId,
      proxyListId: run.proxyListId,
      triggerType: run.triggerType,
      status: run.status,
      checkMode: run.checkMode,
      sourceKey: run.sourceKey,
      sourceName: run.sourceName,
      targetListName: run.targetListName,
      scheduleCron: run.scheduleCron,
      scrapedTotal: run.scrapedTotal,
      createdCount: run.createdCount,
      updatedCount: run.updatedCount,
      invalidCount: run.invalidCount,
      duplicateCount: run.duplicateCount,
      enqueuedCount: run.enqueuedCount,
      errorMessage: run.errorMessage,
      meta: run.meta,
      startedAt: run.startedAt?.toISO() ?? null,
      finishedAt: run.finishedAt?.toISO() ?? null,
    }
  }

  async listRecentRuns(teamId: number, limit = 12, proxyListId?: number | null) {
    const query = ScraperRun.query().where('team_id', teamId)
    if (proxyListId) query.where('proxy_list_id', proxyListId)

    const runs = await query.orderBy('started_at', 'desc').limit(limit)

    return runs.map((run) => this.serializeRun(run))
  }

  async runSource(
    source: ScraperSource,
    list: ProxyList,
    options: RunSourceOptions = {}
  ): Promise<SourceRunSummary> {
    const requestedMode = options.requestedMode ?? 'request'
    const triggerType = options.triggerType ?? 'manual'
    const startedAt = DateTime.now()

    const run = await ScraperRun.create({
      teamId: source.teamId,
      scraperSourceId: source.id,
      proxyListId: list.id,
      triggerType,
      status: 'running',
      checkMode: requestedMode,
      sourceKey: source.sourceKey,
      sourceName: source.name,
      targetListName: list.name,
      scheduleCron: source.scheduleCron,
      meta: {
        stage: 'scraping',
        stageLabel: 'Fetching source data',
        progressCurrent: 1,
        progressTotal: 3,
      },
      startedAt,
    })

    try {
      const scraped = await scraperClient.scrape([source.sourceKey])
      const sourceError = getSourceScrapeError(scraped, source.sourceKey)
      if (sourceError) {
        const finishedAt = DateTime.now()
        source.lastRunAt = finishedAt
        await source.save()

        run.status = 'error'
        run.errorMessage = `${source.name}: ${sourceError}`
        run.meta = {
          stage: 'failed',
          stageLabel: 'Source scrape failed',
          progressCurrent: 1,
          progressTotal: 3,
          bySource: scraped.bySource,
        }
        run.finishedAt = finishedAt
        await run.save()
        throw new Error(run.errorMessage)
      }

      run.scrapedTotal = scraped.total
      run.meta = {
        stage: 'importing',
        stageLabel: `Importing ${scraped.total} proxies`,
        progressCurrent: 2,
        progressTotal: 3,
      }
      await run.save()

      const raw = this.buildImportBlob(scraped.proxies)
      const importSummary: ImportSummary = raw
        ? await importService.importToList(list, raw, 'http', 'scrape', requestedMode)
        : {
            totalLines: 0,
            parsed: 0,
            invalid: 0,
            invalidSamples: [],
            duplicatesInBatch: 0,
            created: 0,
            updated: 0,
            enqueued: 0,
            autoCheckRunId: null,
          }

      source.lastCount = scraped.total
      source.lastRunAt = DateTime.now()
      await source.save()

      run.status = 'success'
      run.scrapedTotal = scraped.total
      run.createdCount = importSummary.created
      run.updatedCount = importSummary.updated
      run.invalidCount = importSummary.invalid
      run.duplicateCount = importSummary.duplicatesInBatch
      run.enqueuedCount = importSummary.enqueued
      run.meta = {
        stage: 'completed',
        stageLabel: 'Scraper finished',
        progressCurrent: 3,
        progressTotal: 3,
        autoCheckRunId: importSummary.autoCheckRunId,
        bySource: scraped.bySource,
      }
      run.finishedAt = source.lastRunAt
      await run.save()

      return {
        runId: run.id,
        sourceId: source.id,
        sourceKey: source.sourceKey,
        sourceName: source.name,
        targetListId: list.id,
        targetListName: list.name,
        requestedMode,
        triggerType,
        status: 'success',
        scrapedTotal: scraped.total,
        created: importSummary.created,
        updated: importSummary.updated,
        invalid: importSummary.invalid,
        duplicatesInBatch: importSummary.duplicatesInBatch,
        enqueued: importSummary.enqueued,
        bySource: scraped.bySource,
        finishedAt: source.lastRunAt?.toISO() ?? new Date().toISOString(),
        errorMessage: null,
      }
    } catch (error) {
      run.status = 'error'
      run.errorMessage = (error as Error).message
      run.meta = {
        ...(run.meta ?? {}),
        stage: 'failed',
        stageLabel: 'Scraper run failed',
      }
      run.finishedAt = DateTime.now()
      await run.save()
      throw error
    }
  }

  summarizeBatch(results: SourceRunSummary[], requestedMode: CheckMode): BatchRunSummary {
    return {
      requestedMode,
      totalSources: results.length,
      completedSources: results.length,
      totalScraped: results.reduce((sum, result) => sum + result.scrapedTotal, 0),
      totalCreated: results.reduce((sum, result) => sum + result.created, 0),
      totalUpdated: results.reduce((sum, result) => sum + result.updated, 0),
      totalInvalid: results.reduce((sum, result) => sum + result.invalid, 0),
      totalEnqueued: results.reduce((sum, result) => sum + result.enqueued, 0),
      results,
    }
  }
}

export default new ScraperPipelineService()
