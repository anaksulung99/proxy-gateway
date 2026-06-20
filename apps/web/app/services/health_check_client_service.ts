import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import type ProxyEntry from '#models/proxy_entry'
import HealthResult from '#models/health_result'
import HealthCheckRun from '#models/health_check_run'
import geoEnrichment from '#services/geo_enrichment_service'
import proxyEngineClient from '#services/proxy_engine_client_service'

export type CheckMode = 'request' | 'playwright' | 'crawlee'

export interface ProxyCheckInput {
  proxyId: string
  host: string
  port: number | string
  protocol: string
  username?: string | null
  password?: string | null
}

export interface CheckResult {
  proxyId: string
  healthy: boolean
  latencyMs: number
  returnedIp: string
  statusCode: number
  error: string
  mode: string
}

export interface HealthCheckRunSummary {
  runId: number
  sourceType: 'tools' | 'proxy_list_bulk'
  status: 'success' | 'error'
  mode: CheckMode
  targetUrl: string | null
  totalInputs: number
  checked: number
  healthy: number
  unhealthy: number
  timeout: number
  invalid: number
  proxyListId?: number | null
  finishedAt: string
  errorMessage?: string | null
}

export interface TrackedRunOptions {
  teamId: number
  sourceType: 'tools' | 'proxy_list_bulk'
  mode?: CheckMode
  targetUrl?: string
  proxyListId?: number | null
  invalidCount?: number
  meta?: Record<string, unknown> | null
}

function baseUrl(): string {
  return env.get('HEALTH_CHECKER_URL', 'http://127.0.0.1:8003')
}

function classify(r: CheckResult): 'healthy' | 'unhealthy' | 'timeout' {
  if (r.healthy) return 'healthy'
  if (/timeout|deadline exceeded/i.test(r.error)) return 'timeout'
  return 'unhealthy'
}

/**
 * Client for the Go health-checker's synchronous HTTP API. Used by the Tools
 * page (ad-hoc checks) and by list re-checks. Network failures are surfaced as
 * thrown errors so the caller can flash a friendly message.
 */
export class HealthCheckClientService {
  summarizeResults(results: CheckResult[], invalidCount = 0) {
    const summary = { checked: 0, healthy: 0, unhealthy: 0, timeout: 0, invalid: invalidCount }
    for (const result of results) {
      const status = classify(result)
      summary.checked++
      summary[status]++
    }
    return summary
  }

  serializeRun(run: HealthCheckRun) {
    return {
      id: run.id,
      sourceType: run.sourceType,
      status: run.status,
      mode: run.mode,
      targetUrl: run.targetUrl,
      totalInputs: run.totalInputs,
      checkedCount: run.checkedCount,
      healthyCount: run.healthyCount,
      unhealthyCount: run.unhealthyCount,
      timeoutCount: run.timeoutCount,
      invalidCount: run.invalidCount,
      errorMessage: run.errorMessage,
      meta: run.meta,
      proxyListId: run.proxyListId,
      startedAt: run.startedAt?.toISO() ?? null,
      finishedAt: run.finishedAt?.toISO() ?? null,
    }
  }

  async listRecentRuns(teamId: number, limit = 12, proxyListId?: number | null) {
    const query = HealthCheckRun.query().where('team_id', teamId)
    if (proxyListId) query.where('proxy_list_id', proxyListId)

    const runs = await query.orderBy('started_at', 'desc').limit(limit)

    return runs.map((run) => this.serializeRun(run))
  }

  /** Raw batch check — returns the checker's results without persisting. */
  async checkProxies(
    inputs: ProxyCheckInput[],
    mode: CheckMode = 'request',
    targetUrl?: string
  ): Promise<CheckResult[]> {
    if (inputs.length === 0) return []

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 120_000)
    try {
      const resp = await fetch(`${baseUrl()}/check/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          targetUrl: targetUrl || env.get('HEALTH_CHECKER_TARGET_URL'),
          proxies: inputs.map((p) => ({
            proxyId: String(p.proxyId),
            host: p.host,
            port: String(p.port),
            protocol: p.protocol,
            username: p.username ?? '',
            password: p.password ?? '',
          })),
        }),
      })
      if (!resp.ok) throw new Error(`checker responded ${resp.status}`)
      const data = (await resp.json()) as { results: CheckResult[] }
      return data.results ?? []
    } catch (err) {
      logger.error({ err }, 'health-checker request failed')
      throw new Error('Health-checker service is unreachable (is it running on :8003?)')
    } finally {
      clearTimeout(timer)
    }
  }

  async runTrackedCheck(
    inputs: ProxyCheckInput[],
    options: TrackedRunOptions
  ): Promise<{ results: CheckResult[]; summary: HealthCheckRunSummary }> {
    const mode = options.mode ?? 'request'
    const targetUrl = options.targetUrl ?? null
    const invalidCount = options.invalidCount ?? 0
    const startedAt = DateTime.now()

    const run = await HealthCheckRun.create({
      teamId: options.teamId,
      proxyListId: options.proxyListId ?? null,
      sourceType: options.sourceType,
      status: 'running',
      mode,
      targetUrl,
      totalInputs: inputs.length + invalidCount,
      invalidCount,
      meta: options.meta ?? null,
      startedAt,
    })

    try {
      const results = await this.checkProxies(inputs, mode, targetUrl ?? undefined)
      const counts = this.summarizeResults(results, invalidCount)
      run.status = 'success'
      run.checkedCount = counts.checked
      run.healthyCount = counts.healthy
      run.unhealthyCount = counts.unhealthy
      run.timeoutCount = counts.timeout
      run.invalidCount = counts.invalid
      run.meta = {
        ...(run.meta ?? {}),
        sampleResults: results.slice(0, 10),
      }
      run.finishedAt = DateTime.now()
      await run.save()

      return {
        results,
        summary: {
          runId: run.id,
          sourceType: options.sourceType,
          status: 'success',
          mode,
          targetUrl,
          totalInputs: run.totalInputs,
          checked: counts.checked,
          healthy: counts.healthy,
          unhealthy: counts.unhealthy,
          timeout: counts.timeout,
          invalid: counts.invalid,
          proxyListId: options.proxyListId ?? null,
          finishedAt: run.finishedAt?.toISO() ?? new Date().toISOString(),
          errorMessage: null,
        },
      }
    } catch (error) {
      run.status = 'error'
      run.errorMessage = (error as Error).message
      run.finishedAt = DateTime.now()
      await run.save()
      throw error
    }
  }

  /**
   * Check a set of proxy entries and persist outcomes: updates each entry's
   * status/latency/returned_ip/last_checked_at and appends a health_results row.
   */
  async checkEntries(
    entries: ProxyEntry[],
    mode: CheckMode = 'request',
    options?: { teamId?: number; proxyListId?: number | null; meta?: Record<string, unknown> | null }
  ) {
    if (entries.length === 0) {
      return {
        checked: 0,
        healthy: 0,
        unhealthy: 0,
        timeout: 0,
        invalid: 0,
        runId: null,
        sourceType: null,
        mode,
        targetUrl: null,
        finishedAt: null,
      }
    }

    const inputs: ProxyCheckInput[] = entries.map((e) => ({
      proxyId: String(e.id),
      host: e.host,
      port: e.port,
      protocol: e.protocol === 'any' ? 'http' : e.protocol,
      username: e.username,
      password: e.password,
    }))

    const trackedRun =
      options?.teamId !== null
        ? await this.runTrackedCheck(inputs, {
            teamId: options?.teamId as number,
            sourceType: 'proxy_list_bulk',
            mode,
            proxyListId: options?.proxyListId ?? null,
            meta: options?.meta ?? { trigger: 'manual_recheck' },
          })
        : null
    const results = trackedRun?.results ?? (await this.checkProxies(inputs, mode))
    const byId = new Map(results.map((r) => [r.proxyId, r]))
    const now = DateTime.now()
    const summary = {
      checked: 0,
      healthy: 0,
      unhealthy: 0,
      timeout: 0,
      invalid: 0,
      runId: trackedRun?.summary.runId ?? null,
      sourceType: trackedRun?.summary.sourceType ?? null,
      mode,
      targetUrl: trackedRun?.summary.targetUrl ?? null,
      finishedAt: trackedRun?.summary.finishedAt ?? null,
    }

    await db.transaction(async (trx) => {
      for (const entry of entries) {
        const r = byId.get(String(entry.id))
        if (!r) continue
        const status = classify(r)
        summary.checked++
        summary[status]++

        entry.useTransaction(trx)
        entry.status = status
        entry.latencyMs = r.latencyMs > 0 ? r.latencyMs : null
        if (r.returnedIp) entry.returnedIp = r.returnedIp
        entry.lastCheckedAt = now
        await entry.save()

        await HealthResult.create(
          {
            proxyEntryId: entry.id,
            mode,
            healthy: r.healthy,
            latencyMs: r.latencyMs > 0 ? r.latencyMs : null,
            returnedIp: r.returnedIp || null,
            statusCode: r.statusCode || null,
            errorMessage: r.error || null,
            checkedAt: now,
          },
          { client: trx }
        )
      }
    })

    // Geo/ASN enrichment from each proxy's exit IP — makes geo filters work.
    const enrichIds = entries.filter((e) => byId.get(String(e.id))?.returnedIp).map((e) => e.id)
    if (enrichIds.length > 0) {
      const enrichPromise = geoEnrichment
        .enrichByIds(enrichIds)
        .catch((err) => logger.warn({ err }, 'inline geo enrichment failed'))
      // Block only for modest sets so re-checks show country immediately; the
      // scheduler backfills larger batches.
      if (enrichIds.length <= 200) await enrichPromise
    }

    // Pool/geo changed — drop the gateway's cached list config so it reloads.
    if (options?.proxyListId) {
      void proxyEngineClient.invalidateLists([options.proxyListId])
    }

    return summary
  }

  async createQueuedRun(options: {
    teamId: number
    proxyListId?: number | null
    mode?: CheckMode
    totalInputs: number
    invalidCount?: number
    meta?: Record<string, unknown> | null
  }) {
    return HealthCheckRun.create({
      teamId: options.teamId,
      proxyListId: options.proxyListId ?? null,
      sourceType: 'proxy_list_bulk',
      status: 'running',
      mode: options.mode ?? 'request',
      totalInputs: options.totalInputs,
      invalidCount: options.invalidCount ?? 0,
      meta: options.meta ?? { trigger: 'import_auto_check' },
      startedAt: DateTime.now(),
    })
  }

  async markRunError(runId: number, message: string) {
    const run = await HealthCheckRun.find(runId)
    if (!run) return

    run.status = 'error'
    run.errorMessage = message
    run.finishedAt = DateTime.now()
    run.meta = {
      ...(run.meta ?? {}),
      stage: 'error',
    }
    await run.save()
  }
}

export default new HealthCheckClientService()
