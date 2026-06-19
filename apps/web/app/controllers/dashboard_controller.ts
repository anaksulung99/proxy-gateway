import db from '@adonisjs/lucid/services/db'
import ProxyList from '#models/proxy_list'
import ScraperSource from '#models/scraper_source'
import ScraperRun from '#models/scraper_run'
import HealthCheckRun from '#models/health_check_run'
import rotationService from '#services/proxy_rotation_service'
import scraperPipeline from '#services/scraper_pipeline_service'
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
      usageOverviewRows,
      usageTopTargetRow,
      usageTopPoolRow,
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
}
