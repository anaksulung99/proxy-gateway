/* eslint-disable prettier/prettier */
import db from '@adonisjs/lucid/services/db'
import ProxyList from '#models/proxy_list'
import ScraperSource from '#models/scraper_source'
import ScraperRun from '#models/scraper_run'
import HealthCheckRun from '#models/health_check_run'
import rotationService from '#services/proxy_rotation_service'
import scraperPipeline from '#services/scraper_pipeline_service'
import scraperClient from '#services/scraper_client_service'
import healthClient from '#services/health_check_client_service'
import proxyEngineClient from '#services/proxy_engine_client_service'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class DashboardController {
  async index({ inertia, request, team }: HttpContext) {
    const allProxyLists = await ProxyList.query()
      .where('team_id', team.id)
      .preload('rotationConfig')
      .preload('scraperSources')
      .orderBy('name', 'asc')

    const requestedListId = request.qs().listId ? Number(request.qs().listId) : null
    const selectedPool = requestedListId
      ? (allProxyLists.find((list) => list.id === requestedListId) ?? null)
      : null
    const proxyLists = selectedPool ? [selectedPool] : allProxyLists
    const listIds = proxyLists.map((list) => list.id)

    let totalEntries = 0
    const byStatus: Record<string, number> = {
      healthy: 0,
      unhealthy: 0,
      timeout: 0,
      unknown: 0,
    }
    if (listIds.length) {
      const rows = await db
        .from('proxy_entries')
        .whereIn('proxy_list_id', listIds)
        .select('status')
        .count('* as c')
        .groupBy('status')
      for (const r of rows) {
        const c = Number(r.c)
        byStatus[r.status] = c
        totalEntries += c
      }
    }

    const perListRows = listIds.length
      ? await db
        .from('proxy_entries')
        .whereIn('proxy_list_id', listIds)
        .select('proxy_list_id', 'status')
        .count('* as c')
        .groupBy('proxy_list_id', 'status')
      : []

    const perListStatus = new Map<
      number,
      { total: number; healthy: number; unhealthy: number; timeout: number; unknown: number }
    >()
    for (const row of perListRows) {
      const listId = Number(row.proxy_list_id)
      const count = Number(row.c)
      const current = perListStatus.get(listId) ?? {
        total: 0,
        healthy: 0,
        unhealthy: 0,
        timeout: 0,
        unknown: 0,
      }
      current.total += count
      current[row.status as 'healthy' | 'unhealthy' | 'timeout' | 'unknown'] += count
      perListStatus.set(listId, current)
    }

    const now = DateTime.now()
    const last24h = now.minus({ hours: 24 })
    const [
      scraperSources,
      scraperRuns24h,
      scraperErrors24h,
      healthRuns24h,
      healthErrors24h,
      proxyEngineRuntime,
      scraperHealthSnapshot,
      usageOverviewRows,
      usageTopTargetRow,
      usageTopPoolRow,
      runtimeQuarantineSummaryRow,
      recentRuntimeQuarantineRows,
    ] = await Promise.all([
      selectedPool
        ? ScraperSource.query().where('team_id', team.id).where('proxy_list_id', selectedPool.id)
        : ScraperSource.query().where('team_id', team.id),
      ScraperRun.query()
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('started_at', '>=', last24h.toSQL()!),
      ScraperRun.query()
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('started_at', '>=', last24h.toSQL()!)
        .where('status', 'error'),
      HealthCheckRun.query()
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('started_at', '>=', last24h.toSQL()!),
      HealthCheckRun.query()
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('started_at', '>=', last24h.toSQL()!)
        .where('status', 'error'),
      proxyEngineClient.fetchRuntimeStatus(),
      scraperClient.fetchSourceHealth(),
      db
        .from('proxy_usage_logs')
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('requested_at', '>=', last24h.toSQL()!)
        .count('* as total_requests')
        .select(
          db.raw('SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests'),
          db.raw('SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_requests')
        )
        .avg('duration_ms as avg_duration_ms')
        .sum('response_bytes as total_response_bytes'),
      db
        .from('proxy_usage_logs')
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('requested_at', '>=', last24h.toSQL()!)
        .whereNotNull('target_host')
        .select('target_host')
        .count('* as request_count')
        .groupBy('target_host')
        .orderBy('request_count', 'desc')
        .first(),
      db
        .from('proxy_usage_logs')
        .leftJoin('proxy_lists', 'proxy_usage_logs.proxy_list_id', 'proxy_lists.id')
        .where('proxy_usage_logs.team_id', team.id)
        .if(selectedPool !== null, (query) =>
          query.where('proxy_usage_logs.proxy_list_id', selectedPool!.id)
        )
        .where('proxy_usage_logs.requested_at', '>=', last24h.toSQL()!)
        .select('proxy_usage_logs.proxy_list_id', 'proxy_lists.name as proxy_list_name')
        .count('* as request_count')
        .groupBy('proxy_usage_logs.proxy_list_id', 'proxy_lists.name')
        .orderBy('request_count', 'desc')
        .first(),
      db
        .from('health_results')
        .innerJoin('proxy_entries', 'proxy_entries.id', 'health_results.proxy_entry_id')
        .where('health_results.checked_at', '>=', last24h.toSQL()!)
        .where('health_results.error_message', 'like', '[runtime]%')
        .if(selectedPool !== null, (query) => query.where('proxy_entries.proxy_list_id', selectedPool!.id))
        .count('* as total')
        .select(
          db.raw(`
            SUM(
              CASE
                WHEN LOWER(COALESCE(health_results.error_message, '')) LIKE '%timeout%'
                  OR LOWER(COALESCE(health_results.error_message, '')) LIKE '%deadline%'
                THEN 1 ELSE 0
              END
            ) as timeout_count
          `),
          db.raw(`
            SUM(
              CASE
                WHEN LOWER(COALESCE(health_results.error_message, '')) LIKE '%timeout%'
                  OR LOWER(COALESCE(health_results.error_message, '')) LIKE '%deadline%'
                THEN 0 ELSE 1
              END
            ) as unhealthy_count
          `),
          db.raw('COUNT(DISTINCT proxy_entries.proxy_list_id) as affected_lists'),
          db.raw('MAX(health_results.checked_at) as latest_checked_at')
        )
        .first(),
      db
        .from('health_results')
        .innerJoin('proxy_entries', 'proxy_entries.id', 'health_results.proxy_entry_id')
        .leftJoin('proxy_lists', 'proxy_lists.id', 'proxy_entries.proxy_list_id')
        .where('health_results.error_message', 'like', '[runtime]%')
        .if(selectedPool !== null, (query) => query.where('proxy_entries.proxy_list_id', selectedPool!.id))
        .select(
          'health_results.id',
          'health_results.checked_at',
          'health_results.error_message',
          'proxy_entries.id as proxy_entry_id',
          'proxy_entries.proxy_list_id',
          'proxy_entries.host',
          'proxy_entries.port',
          'proxy_entries.protocol',
          'proxy_entries.status as proxy_status',
          'proxy_entries.country_code',
          'proxy_lists.name as proxy_list_name'
        )
        .orderBy('health_results.checked_at', 'desc')
        .limit(6),
    ])

    const enabledScrapers = scraperSources.filter((source) => source.isEnabled)
    const scheduledScrapers = enabledScrapers.filter((source) => Boolean(source.scheduleCron))
    const configuredScrapers = scraperSources.filter((source) => source.proxyListId)
    const orphanSources = enabledScrapers.filter((source) => !source.proxyListId)
    const activeLists = proxyLists.filter((list) => list.isActive)
    const healthyRatio = totalEntries > 0 ? Math.round((byStatus.healthy / totalEntries) * 100) : 0
    const needAttention = byStatus.unhealthy + byStatus.timeout + byStatus.unknown
    const usageOverview = usageOverviewRows[0]
    const usageRequests24h = Number(usageOverview?.total_requests ?? 0)
    const usageSuccessful24h = Number(usageOverview?.successful_requests ?? 0)
    const usageFailed24h = Number(usageOverview?.failed_requests ?? 0)
    const usageSuccessRate24h =
      usageRequests24h > 0 ? Math.round((usageSuccessful24h / usageRequests24h) * 100) : 0
    const runtimeQuarantine = {
      total24h: Number(runtimeQuarantineSummaryRow?.total ?? 0),
      timeout24h: Number(runtimeQuarantineSummaryRow?.timeout_count ?? 0),
      unhealthy24h: Number(runtimeQuarantineSummaryRow?.unhealthy_count ?? 0),
      affectedLists24h: Number(runtimeQuarantineSummaryRow?.affected_lists ?? 0),
      latestAt:
        typeof runtimeQuarantineSummaryRow?.latest_checked_at === 'string'
          ? runtimeQuarantineSummaryRow.latest_checked_at
          : runtimeQuarantineSummaryRow?.latest_checked_at
            ? new Date(runtimeQuarantineSummaryRow.latest_checked_at).toISOString()
            : null,
      recent: recentRuntimeQuarantineRows.map((row: any) => ({
        id: Number(row.id),
        proxyEntryId: Number(row.proxy_entry_id),
        proxyListId: Number(row.proxy_list_id),
        proxyListName: row.proxy_list_name ?? `List #${row.proxy_list_id}`,
        endpoint: `${row.host}:${row.port}`,
        protocol: row.protocol,
        countryCode: row.country_code ?? null,
        status: this.runtimeFailureStatus(row.error_message, row.proxy_status),
        checkedAt:
          typeof row.checked_at === 'string' ? row.checked_at : new Date(row.checked_at).toISOString(),
        errorMessage:
          typeof row.error_message === 'string'
            ? row.error_message.replace(/^\[runtime\]\s*/i, '')
            : 'runtime failure',
      })),
    }
    const scraperHealth = scraperHealthSnapshot.ok
      ? {
        ok: true as const,
        generatedAt: scraperHealthSnapshot.summary.generatedAt,
        overview: scraperHealthSnapshot.summary.overview,
        attentionSources: scraperHealthSnapshot.summary.sources
          .filter((source) => source.status !== 'healthy' && source.status !== 'idle')
          .sort((a, b) => {
            const severity = {
              misconfigured: 0,
              error: 1,
              degraded: 2,
              idle: 3,
              healthy: 4,
            }
            const severityDiff =
              severity[a.status as keyof typeof severity] -
              severity[b.status as keyof typeof severity]
            if (severityDiff !== 0) return severityDiff
            return b.consecutiveFailures - a.consecutiveFailures
          })
          .slice(0, 5)
          .map((source) => ({
            source: source.source,
            status: source.status,
            lastResult: source.lastResult,
            lastRunAt: source.lastRunAt,
            lastSuccessAt: source.lastSuccessAt,
            lastDurationMs: source.lastDurationMs,
            lastEntries: source.lastEntries,
            consecutiveFailures: source.consecutiveFailures,
            logsHref: `/app/scraper/logs?${new URLSearchParams({ sourceKey: source.source }).toString()}`,
            triggers: source.triggers.map((trigger) => ({
              trigger: trigger.trigger,
              status: trigger.status,
              totalRuns: trigger.totalRuns,
              successfulRuns: trigger.successfulRuns,
              errorRuns: trigger.errorRuns,
              consecutiveFailures: trigger.consecutiveFailures,
              lastRunAt: trigger.lastRunAt,
            })),
          })),
      }
      : {
        ok: false as const,
        error: scraperHealthSnapshot.error,
      }

    const pools = proxyLists
      .map((list) => {
        const stats = perListStatus.get(list.id) ?? {
          total: 0,
          healthy: 0,
          unhealthy: 0,
          timeout: 0,
          unknown: 0,
        }
        return {
          id: list.id,
          name: list.name,
          isActive: list.isActive,
          entriesCount: stats.total,
          healthyCount: stats.healthy,
          unhealthyCount: stats.unhealthy,
          timeoutCount: stats.timeout,
          unknownCount: stats.unknown,
          healthyRatio: stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0,
          scraperSources: list.scraperSources.length,
          rotationSummary: rotationService.summarize(list.rotationConfig),
        }
      })
      .sort((a, b) => b.entriesCount - a.entriesCount)
      .slice(0, 6)

    const alerts: Array<{
      title: string
      detail: string
      tone: 'critical' | 'warning' | 'info'
      href: string
    }> = []
    if (proxyLists.length === 0) {
      alerts.push({
        title: selectedPool ? 'Proxy pool yang dipilih tidak ditemukan' : 'Belum ada proxy pool',
        detail: selectedPool
          ? 'Pilih pool lain atau reset filter untuk melihat seluruh dashboard.'
          : 'Buat proxy list pertama untuk mulai import own proxies atau target scraper.',
        tone: 'info',
        href: '/app/proxy-lists',
      })
    }
    if (orphanSources.length > 0) {
      alerts.push({
        title: `${orphanSources.length} source aktif belum punya target list`,
        detail: 'Source aktif tanpa target list tidak akan bisa mengirim hasil scrape ke pool.',
        tone: 'critical',
        href: '/app/scraper',
      })
    }
    if (byStatus.unknown > 0) {
      alerts.push({
        title: `${byStatus.unknown} proxy belum pernah dicek`,
        detail:
          'Jalankan health checker agar pool siap dipakai untuk sticky atau rotating traffic.',
        tone: 'warning',
        href: '/app/proxy-lists',
      })
    }
    if (scraperErrors24h.length > 0 || healthErrors24h.length > 0) {
      alerts.push({
        title: `${scraperErrors24h.length + healthErrors24h.length} run gagal dalam 24 jam`,
        detail:
          'Cek log scraper dan health checker untuk melihat source atau target yang bermasalah.',
        tone: 'critical',
        href: '/app/scraper/logs',
      })
    }
    if (scheduledScrapers.length === 0 && configuredScrapers.length > 0) {
      alerts.push({
        title: 'Belum ada source dengan schedule otomatis',
        detail: 'Aktifkan schedule cron agar pool publik terus diperbarui tanpa trigger manual.',
        tone: 'info',
        href: '/app/scraper',
      })
    }
    if (!proxyEngineRuntime.ok) {
      alerts.push({
        title: 'Proxy engine admin belum terhubung',
        detail: proxyEngineRuntime.error,
        tone: proxyEngineRuntime.configured ? 'warning' : 'info',
        href: '/app/settings/team',
      })
    }
    if (scraperHealth.ok && scraperHealth.overview.misconfigured > 0) {
      alerts.push({
        title: `${scraperHealth.overview.misconfigured} source scraper misconfigured`,
        detail:
          'Ada source yang terdaftar di service scraper tetapi adapter atau konfigurasi trigger-nya bermasalah.',
        tone: 'critical',
        href: '/app/scraper',
      })
    } else if (
      scraperHealth.ok &&
      (scraperHealth.overview.error > 0 || scraperHealth.overview.degraded > 0)
    ) {
      alerts.push({
        title: `${scraperHealth.overview.error + scraperHealth.overview.degraded} source scraper perlu perhatian`,
        detail:
          'Periksa source-health scraper untuk melihat source yang error, degraded, atau sering gagal beruntun.',
        tone: scraperHealth.overview.error > 0 ? 'critical' : 'warning',
        href: '/app/scraper',
      })
    } else if (!scraperHealth.ok) {
      alerts.push({
        title: 'Scraper source-health belum terhubung',
        detail: scraperHealth.error,
        tone: 'warning',
        href: '/app/scraper',
      })
    }
    if (runtimeQuarantine.total24h > 0) {
      alerts.push({
        title: `${runtimeQuarantine.total24h} proxy auto-quarantine oleh runtime dalam 24 jam`,
        detail: `${runtimeQuarantine.timeout24h} timeout · ${runtimeQuarantine.unhealthy24h} unhealthy di ${runtimeQuarantine.affectedLists24h} pool`,
        tone:
          runtimeQuarantine.timeout24h > 0 || runtimeQuarantine.total24h >= 5 ? 'critical' : 'warning',
        href: '/app/runtime/quarantine',
      })
    }

    return inertia.render('dashboard/index', {
      stats: {
        lists: listIds.length,
        totalLists: allProxyLists.length,
        activeLists: activeLists.length,
        totalEntries,
        healthy: byStatus.healthy,
        unhealthy: byStatus.unhealthy,
        timeout: byStatus.timeout,
        unknown: byStatus.unknown,
        healthyRatio,
        needAttention,
        enabledScrapers: enabledScrapers.length,
        scheduledScrapers: scheduledScrapers.length,
        scraperRuns24h: scraperRuns24h.length,
        scraperErrors24h: scraperErrors24h.length,
        healthRuns24h: healthRuns24h.length,
        healthErrors24h: healthErrors24h.length,
        usageRequests24h,
        usageSuccessful24h,
        usageFailed24h,
        usageSuccessRate24h,
      },
      filters: {
        listId: selectedPool?.id ?? null,
        listName: selectedPool?.name ?? null,
        availablePools: allProxyLists.map((list) => ({ id: list.id, name: list.name })),
      },
      alerts,
      engine: proxyEngineRuntime,
      runtimeQuarantine,
      scraperHealth,
      traffic: {
        avgDurationMs24h: Math.round(Number(usageOverview?.avg_duration_ms ?? 0)),
        totalResponseBytes24h: Number(usageOverview?.total_response_bytes ?? 0),
        topTargetHost: usageTopTargetRow?.target_host ?? null,
        topTargetRequests: Number(usageTopTargetRow?.request_count ?? 0),
        topPoolName: usageTopPoolRow?.proxy_list_name ?? null,
        topPoolRequests: Number(usageTopPoolRow?.request_count ?? 0),
      },
      pools,
      recentScraperRuns: await scraperPipeline.listRecentRuns(team.id, 5, selectedPool?.id ?? null),
      recentHealthRuns: await healthClient.listRecentRuns(team.id, 5, selectedPool?.id ?? null),
    })
  }

  async runtimeQuarantine({ inertia, request, team }: HttpContext) {
    const qs = request.qs()
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10
    const status =
      qs.status === 'timeout' || qs.status === 'unhealthy' ? String(qs.status) : null
    const search = qs.search ? String(qs.search).trim() : null
    const requestedListId = qs.listId ? Number(qs.listId) : null
    const requestedProxyEntryId = qs.proxyEntryId ? Number(qs.proxyEntryId) : null

    const allProxyLists = await ProxyList.query()
      .where('team_id', team.id)
      .orderBy('name', 'asc')

    const selectedList = requestedListId
      ? (allProxyLists.find((list) => list.id === requestedListId) ?? null)
      : null

    const buildQuery = () => {
      const query = db
        .from('health_results')
        .innerJoin('proxy_entries', 'proxy_entries.id', 'health_results.proxy_entry_id')
        .innerJoin('proxy_lists', 'proxy_lists.id', 'proxy_entries.proxy_list_id')
        .where('proxy_lists.team_id', team.id)
        .where('health_results.error_message', 'like', '[runtime]%')

      if (selectedList) {
        query.where('proxy_entries.proxy_list_id', selectedList.id)
      }

      if (requestedProxyEntryId && Number.isInteger(requestedProxyEntryId)) {
        query.where('proxy_entries.id', requestedProxyEntryId)
      }

      if (status === 'timeout') {
        query.whereRaw(this.runtimeTimeoutCondition())
      } else if (status === 'unhealthy') {
        query.whereRaw(`NOT (${this.runtimeTimeoutCondition()})`)
      }

      if (search) {
        query.where((builder) => {
          builder
            .where('proxy_entries.host', 'like', `%${search}%`)
            .orWhere('proxy_lists.name', 'like', `%${search}%`)
            .orWhere('health_results.error_message', 'like', `%${search}%`)
        })
      }

      return query
    }

    const now = DateTime.now()
    const last24h = now.minus({ hours: 24 }).toSQL()!
    const totalRow = await buildQuery().count('* as total').first()
    const total = Number(totalRow?.total ?? 0)
    const rows = await buildQuery()
      .select(
        'health_results.id',
        'health_results.checked_at',
        'health_results.error_message',
        'proxy_entries.id as proxy_entry_id',
        'proxy_entries.proxy_list_id',
        'proxy_entries.host',
        'proxy_entries.port',
        'proxy_entries.protocol',
        'proxy_entries.status as proxy_status',
        'proxy_entries.country_code',
        'proxy_lists.name as proxy_list_name'
      )
      .orderBy('health_results.checked_at', 'desc')
      .offset((page - 1) * perPage)
      .limit(perPage)

    const summaryRow = await buildQuery()
      .where('health_results.checked_at', '>=', last24h)
      .count('* as total')
      .select(
        db.raw(`
          SUM(
            CASE
              WHEN ${this.runtimeTimeoutCondition()}
              THEN 1 ELSE 0
            END
          ) as timeout_count
        `),
        db.raw(`
          SUM(
            CASE
              WHEN ${this.runtimeTimeoutCondition()}
              THEN 0 ELSE 1
            END
          ) as unhealthy_count
        `),
        db.raw('COUNT(DISTINCT proxy_entries.proxy_list_id) as affected_lists'),
        db.raw('MAX(health_results.checked_at) as latest_checked_at')
      )
      .first()

    return inertia.render('dashboard/runtime_quarantine', {
      rows: rows.map((row: any) => this.serializeRuntimeQuarantineRow(row)),
      meta: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.max(1, Math.ceil(total / perPage)),
      },
      summary: {
        total24h: Number(summaryRow?.total ?? 0),
        timeout24h: Number(summaryRow?.timeout_count ?? 0),
        unhealthy24h: Number(summaryRow?.unhealthy_count ?? 0),
        affectedLists24h: Number(summaryRow?.affected_lists ?? 0),
        latestAt:
          typeof summaryRow?.latest_checked_at === 'string'
            ? summaryRow.latest_checked_at
            : summaryRow?.latest_checked_at
              ? new Date(summaryRow.latest_checked_at).toISOString()
              : null,
      },
      filters: {
        status: (status ?? 'timeout') as 'timeout' | 'unhealthy',
        search,
        listId: selectedList?.id ?? null,
        listName: selectedList?.name ?? null,
        availablePools: allProxyLists.map((list) => ({ id: list.id, name: list.name })),
      },
    })
  }

  async activeTasks({ response, team }: HttpContext) {
    const since = DateTime.now().minus({ minutes: 20 }).toSQL()!
    const [healthRuns, scraperRuns, runtimeQuarantineRows] = await Promise.all([
      HealthCheckRun.query()
        .where('team_id', team.id)
        .where('updated_at', '>=', since)
        .orderBy('updated_at', 'desc')
        .limit(12),
      ScraperRun.query()
        .where('team_id', team.id)
        .where('updated_at', '>=', since)
        .orderBy('updated_at', 'desc')
        .limit(12),
      db
        .from('health_results')
        .innerJoin('proxy_entries', 'proxy_entries.id', 'health_results.proxy_entry_id')
        .innerJoin('proxy_lists', 'proxy_lists.id', 'proxy_entries.proxy_list_id')
        .where('proxy_lists.team_id', team.id)
        .where('health_results.error_message', 'like', '[runtime]%')
        .where('health_results.checked_at', '>=', since)
        .select(
          'health_results.id',
          'health_results.checked_at',
          'health_results.error_message',
          'proxy_entries.id as proxy_entry_id',
          'proxy_entries.proxy_list_id',
          'proxy_entries.host',
          'proxy_entries.port',
          'proxy_entries.protocol',
          'proxy_entries.status as proxy_status',
          'proxy_entries.country_code',
          'proxy_lists.name as proxy_list_name'
        )
        .orderBy('health_results.checked_at', 'desc')
        .limit(12),
    ])

    const tasks = [
      ...healthRuns.map((run) => this.serializeHealthTask(run)),
      ...scraperRuns.map((run) => this.serializeScraperTask(run)),
    ].sort((a, b) => {
      const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return right - left
    })

    return response.ok({
      generatedAt: DateTime.now().toISO(),
      tasks,
      quarantineEvents: runtimeQuarantineRows.map((row: any) =>
        this.serializeRuntimeQuarantineEvent(row)
      ),
    })
  }

  private serializeHealthTask(run: HealthCheckRun) {
    const meta = ((run.meta ?? {}) as Record<string, unknown>) || {}
    const trigger = typeof meta.trigger === 'string' ? meta.trigger : run.sourceType
    const listName = typeof meta.listName === 'string' ? meta.listName : null
    const title =
      trigger === 'import_auto_check' || trigger === 'scraper_auto_check'
        ? 'Auto health check'
        : trigger === 'manual_recheck'
          ? 'Proxy list recheck'
          : 'Manual health check'
    const detail = [listName, run.mode.toUpperCase()].filter(Boolean).join(' | ')
    const progressLabel = `${run.checkedCount}/${run.totalInputs} checked | ${run.healthyCount} healthy | ${run.unhealthyCount} unhealthy | ${run.timeoutCount} timeout`

    return {
      key: `health:${run.id}`,
      kind: 'health_check' as const,
      status: run.status,
      title,
      detail,
      progressLabel,
      current: run.checkedCount,
      total: run.totalInputs,
      percent: this.percent(run.checkedCount, run.totalInputs),
      href:
        trigger === 'tools_manual'
          ? '/app/tools/logs'
          : '/app/tools/logs?sourceType=proxy_list_bulk',
      startedAt: run.startedAt?.toISO() ?? null,
      finishedAt: run.finishedAt?.toISO() ?? null,
      updatedAt: run.updatedAt?.toISO() ?? null,
      errorMessage: run.errorMessage,
    }
  }

  private serializeScraperTask(run: ScraperRun) {
    const meta = ((run.meta ?? {}) as Record<string, unknown>) || {}
    const progressCurrent =
      typeof meta.progressCurrent === 'number' ? meta.progressCurrent : run.status === 'success' ? 3 : 1
    const progressTotal = typeof meta.progressTotal === 'number' ? meta.progressTotal : 3
    const stageLabel =
      typeof meta.stageLabel === 'string'
        ? meta.stageLabel
        : run.status === 'running'
          ? 'Running scraper pipeline'
          : 'Scraper finished'

    return {
      key: `scraper:${run.id}`,
      kind: 'scraper' as const,
      status: run.status,
      title: `Scraper ${run.sourceName}`,
      detail: [run.triggerType, run.checkMode.toUpperCase(), run.targetListName].filter(Boolean).join(' | '),
      progressLabel:
        run.status === 'running'
          ? stageLabel
          : `${run.scrapedTotal} scraped | ${run.createdCount} new | ${run.updatedCount} updated | ${run.enqueuedCount} queued`,
      current: progressCurrent,
      total: progressTotal,
      percent: this.percent(progressCurrent, progressTotal),
      href: `/app/scraper/logs?sourceKey=${encodeURIComponent(run.sourceKey)}`,
      startedAt: run.startedAt?.toISO() ?? null,
      finishedAt: run.finishedAt?.toISO() ?? null,
      updatedAt: run.updatedAt?.toISO() ?? null,
      errorMessage: run.errorMessage,
    }
  }

  private percent(current: number, total: number) {
    if (total <= 0) return null
    return Math.max(0, Math.min(100, Math.round((current / total) * 100)))
  }

  private runtimeTimeoutCondition() {
    return `LOWER(COALESCE(health_results.error_message, '')) LIKE '%timeout%' OR LOWER(COALESCE(health_results.error_message, '')) LIKE '%deadline%'`
  }

  private serializeRuntimeQuarantineRow(row: any) {
    return {
      id: Number(row.id),
      proxyEntryId: Number(row.proxy_entry_id),
      proxyListId: Number(row.proxy_list_id),
      proxyListName: row.proxy_list_name ?? `List #${row.proxy_list_id}`,
      endpoint: `${row.host}:${row.port}`,
      protocol: row.protocol,
      countryCode: row.country_code ?? null,
      status: this.runtimeFailureStatus(row.error_message, row.proxy_status),
      checkedAt:
        typeof row.checked_at === 'string' ? row.checked_at : new Date(row.checked_at).toISOString(),
      errorMessage:
        typeof row.error_message === 'string'
          ? row.error_message.replace(/^\[runtime\]\s*/i, '')
          : 'runtime failure',
    }
  }

  private serializeRuntimeQuarantineEvent(row: any) {
    const event = this.serializeRuntimeQuarantineRow(row)
    return {
      ...event,
      title:
        event.status === 'timeout'
          ? 'Runtime proxy timeout terdeteksi'
          : 'Runtime proxy unhealthy terdeteksi',
      detail: `${event.proxyListName} | ${event.protocol.toUpperCase()} | ${event.endpoint}`,
      href: `/app/runtime/quarantine?proxyEntryId=${event.proxyEntryId}`,
    }
  }

  private runtimeFailureStatus(errorMessage: string | null, currentStatus?: string | null) {
    const message = String(errorMessage ?? '').toLowerCase()
    if (
      currentStatus === 'timeout' ||
      message.includes('timeout') ||
      message.includes('deadline')
    ) {
      return 'timeout' as const
    }

    return 'unhealthy' as const
  }
}
