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
  private runtimeResolutionColumnsPromise?: Promise<boolean>

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
    const runtimeResolutionSupported = await this.hasRuntimeResolutionColumns()
    const [
      scraperSources,
      scraperRuns24h,
      scraperErrors24h,
      healthRuns24h,
      healthErrors24h,
      proxyEngineRuntime,
      scraperHealthSnapshot,
      usageOverviewRows,
      tunnelUsageSummaryRow,
      recentTunnelIssueRows,
      usageTopTargetRow,
      usageTopPoolRow,
      runtimeQuarantineSummaryRow,
      recentRuntimeQuarantineRows,
      runtimeAutoRecheckSummaryRow,
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
        .where('is_tunnel', true)
        .count('* as total')
        .select(
          db.raw('SUM(CASE WHEN success THEN 1 ELSE 0 END) as established_count'),
          db.raw('SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_connect_count'),
          db.raw(`
            SUM(
              CASE
                WHEN success AND LOWER(COALESCE(error_message, '')) LIKE '%upstream stream error%'
                THEN 1 ELSE 0
              END
            ) as upstream_issue_count
          `),
          db.raw(`
            SUM(
              CASE
                WHEN success AND LOWER(COALESCE(error_message, '')) LIKE '%client stream error%'
                THEN 1 ELSE 0
              END
            ) as client_issue_count
          `),
          db.raw(`
            SUM(
              CASE
                WHEN success AND LOWER(COALESCE(error_message, '')) LIKE '%no payload%'
                THEN 1 ELSE 0
              END
            ) as no_payload_count
          `),
          db.raw('MAX(requested_at) as latest_requested_at')
        )
        .first(),
      db
        .from('proxy_usage_logs')
        .leftJoin('proxy_lists', 'proxy_usage_logs.proxy_list_id', 'proxy_lists.id')
        .where('proxy_usage_logs.team_id', team.id)
        .if(selectedPool !== null, (query) =>
          query.where('proxy_usage_logs.proxy_list_id', selectedPool!.id)
        )
        .where('proxy_usage_logs.requested_at', '>=', last24h.toSQL()!)
        .where('proxy_usage_logs.is_tunnel', true)
        .where((query) => {
          query.where('proxy_usage_logs.success', false).orWhere((builder) => {
            builder.where('proxy_usage_logs.success', true).where((messageQuery) => {
              messageQuery
                .whereILike('proxy_usage_logs.error_message', '%upstream stream error%')
                .orWhereILike('proxy_usage_logs.error_message', '%client stream error%')
                .orWhereILike('proxy_usage_logs.error_message', '%no payload%')
            })
          })
        })
        .select(
          'proxy_usage_logs.id',
          'proxy_usage_logs.proxy_list_id',
          'proxy_usage_logs.request_method',
          'proxy_usage_logs.target_host',
          'proxy_usage_logs.target_port',
          'proxy_usage_logs.target_scheme',
          'proxy_usage_logs.success',
          'proxy_usage_logs.error_message',
          'proxy_usage_logs.requested_at',
          'proxy_lists.name as proxy_list_name'
        )
        .orderBy('proxy_usage_logs.requested_at', 'desc')
        .limit(5),
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
        .if(selectedPool !== null, (query) =>
          query.where('proxy_entries.proxy_list_id', selectedPool!.id)
        )
        .count('* as total')
        .select(
          ...this.runtimeSummarySelects(runtimeResolutionSupported),
          db.raw('COUNT(DISTINCT proxy_entries.proxy_list_id) as affected_lists'),
          db.raw('MAX(health_results.checked_at) as latest_checked_at')
        )
        .first(),
      db
        .from('health_results')
        .innerJoin('proxy_entries', 'proxy_entries.id', 'health_results.proxy_entry_id')
        .leftJoin('proxy_lists', 'proxy_lists.id', 'proxy_entries.proxy_list_id')
        .where('health_results.error_message', 'like', '[runtime]%')
        .if(selectedPool !== null, (query) =>
          query.where('proxy_entries.proxy_list_id', selectedPool!.id)
        )
        .select(
          'health_results.id',
          'health_results.checked_at',
          ...(runtimeResolutionSupported
            ? ['health_results.resolved_at', 'health_results.resolved_by_run_id']
            : [db.raw('NULL as resolved_at'), db.raw('NULL as resolved_by_run_id')]),
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
      db
        .from('health_check_runs')
        .where('team_id', team.id)
        .if(selectedPool !== null, (query) => query.where('proxy_list_id', selectedPool!.id))
        .where('started_at', '>=', last24h.toSQL()!)
        .whereRaw(`COALESCE(meta->>'trigger', source_type) = ?`, ['runtime_auto_recheck'])
        .count('* as total')
        .select(
          db.raw(`SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count`),
          db.raw(`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count`),
          db.raw(`SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_count`),
          db.raw(`
            SUM(
              CASE
                WHEN COALESCE(NULLIF(meta->>'retryAttempt', '')::int, 1) > 1
                THEN 1 ELSE 0
              END
            ) as retried_count
          `),
          db.raw(`
            SUM(
              CASE
                WHEN COALESCE(NULLIF(meta->>'retryAttempt', '')::int, 1) > 1
                  AND healthy_count > 0
                THEN 1 ELSE 0
              END
            ) as retry_recovered_count
          `),
          db.raw('MAX(updated_at) as latest_updated_at')
        )
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
    const tunnelDiagnostics = {
      total24h: Number(tunnelUsageSummaryRow?.total ?? 0),
      established24h: Number(tunnelUsageSummaryRow?.established_count ?? 0),
      failedConnect24h: Number(tunnelUsageSummaryRow?.failed_connect_count ?? 0),
      upstreamIssues24h: Number(tunnelUsageSummaryRow?.upstream_issue_count ?? 0),
      clientIssues24h: Number(tunnelUsageSummaryRow?.client_issue_count ?? 0),
      noPayload24h: Number(tunnelUsageSummaryRow?.no_payload_count ?? 0),
      latestAt:
        typeof tunnelUsageSummaryRow?.latest_requested_at === 'string'
          ? tunnelUsageSummaryRow.latest_requested_at
          : tunnelUsageSummaryRow?.latest_requested_at
            ? new Date(tunnelUsageSummaryRow.latest_requested_at).toISOString()
            : null,
      recentIssues: recentTunnelIssueRows.map((row: any) => {
        const phase = this.tunnelIssuePhase(row.success, row.error_message)
        return {
          id: Number(row.id),
          proxyListId: row.proxy_list_id ? Number(row.proxy_list_id) : null,
          proxyListName: row.proxy_list_name ?? 'Unknown pool',
          requestMethod: row.request_method ?? 'CONNECT',
          targetLabel: this.tunnelTargetLabel(row),
          phase,
          phaseLabel: this.tunnelPhaseLabel(phase),
          requestedAt:
            typeof row.requested_at === 'string'
              ? row.requested_at
              : new Date(row.requested_at).toISOString(),
          message: row.error_message ?? 'Tunnel issue detected',
          href: this.tunnelAnalyticsHref(
            phase,
            row.proxy_list_id ? Number(row.proxy_list_id) : null
          ),
        }
      }),
    }
    const runtimeQuarantine = {
      total24h: Number(runtimeQuarantineSummaryRow?.total ?? 0),
      active24h: Number(runtimeQuarantineSummaryRow?.active_count ?? 0),
      resolved24h: Number(runtimeQuarantineSummaryRow?.resolved_count ?? 0),
      timeout24h: Number(runtimeQuarantineSummaryRow?.timeout_count ?? 0),
      unhealthy24h: Number(runtimeQuarantineSummaryRow?.unhealthy_count ?? 0),
      affectedLists24h: Number(runtimeQuarantineSummaryRow?.affected_lists ?? 0),
      latestAt:
        typeof runtimeQuarantineSummaryRow?.latest_checked_at === 'string'
          ? runtimeQuarantineSummaryRow.latest_checked_at
          : runtimeQuarantineSummaryRow?.latest_checked_at
            ? new Date(runtimeQuarantineSummaryRow.latest_checked_at).toISOString()
            : null,
      autoRecheck: {
        total24h: Number(runtimeAutoRecheckSummaryRow?.total ?? 0),
        success24h: Number(runtimeAutoRecheckSummaryRow?.success_count ?? 0),
        error24h: Number(runtimeAutoRecheckSummaryRow?.error_count ?? 0),
        running24h: Number(runtimeAutoRecheckSummaryRow?.running_count ?? 0),
        retried24h: Number(runtimeAutoRecheckSummaryRow?.retried_count ?? 0),
        recoveredOnRetry24h: Number(runtimeAutoRecheckSummaryRow?.retry_recovered_count ?? 0),
        latestAt:
          typeof runtimeAutoRecheckSummaryRow?.latest_updated_at === 'string'
            ? runtimeAutoRecheckSummaryRow.latest_updated_at
            : runtimeAutoRecheckSummaryRow?.latest_updated_at
              ? new Date(runtimeAutoRecheckSummaryRow.latest_updated_at).toISOString()
              : null,
      },
      recent: recentRuntimeQuarantineRows.map((row: any) => ({
        id: Number(row.id),
        proxyEntryId: Number(row.proxy_entry_id),
        proxyListId: Number(row.proxy_list_id),
        proxyListName: row.proxy_list_name ?? `List #${row.proxy_list_id}`,
        endpoint: `${row.host}:${row.port}`,
        protocol: row.protocol,
        countryCode: row.country_code ?? null,
        status: this.runtimeFailureStatus(row.error_message, row.proxy_status),
        resolution: row.resolved_at ? ('resolved' as const) : ('active' as const),
        checkedAt:
          typeof row.checked_at === 'string'
            ? row.checked_at
            : new Date(row.checked_at).toISOString(),
        resolvedAt: !row.resolved_at
          ? null
          : typeof row.resolved_at === 'string'
            ? row.resolved_at
            : new Date(row.resolved_at).toISOString(),
        resolvedByRunId: row.resolved_by_run_id ? Number(row.resolved_by_run_id) : null,
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
    } else {
      const runtimeMetrics = proxyEngineRuntime.runtime.metrics
      const tunnelFailureTotal =
        runtimeMetrics.tunnel.connectFailed + runtimeMetrics.tunnel.upstreamIssues
      const observedGap =
        runtimeMetrics.runtimeFailures.observedTotal -
        runtimeMetrics.runtimeFailures.quarantinedTotal

      if (proxyEngineRuntime.runtime.usageDropped > 0) {
        alerts.push({
          title: `${proxyEngineRuntime.runtime.usageDropped} usage log sempat ter-drop`,
          detail:
            'Async sink proxy-engine pernah penuh. Periksa tekanan trafik, latency database, atau ukuran buffer usage sink sebelum audit log kehilangan event tambahan.',
          tone: proxyEngineRuntime.runtime.usageDropped >= 10 ? 'critical' : 'warning',
          href: '/app/analytics',
        })
      }

      if (
        runtimeMetrics.requests.total >= 20 &&
        (tunnelFailureTotal >= 5 ||
          (runtimeMetrics.requests.tunnelTotal > 0 &&
            tunnelFailureTotal / runtimeMetrics.requests.tunnelTotal >= 0.3))
      ) {
        alerts.push({
          title: `${tunnelFailureTotal} runtime tunnel failure sejak engine start`,
          detail: `${runtimeMetrics.tunnel.connectFailed} connect failed · ${runtimeMetrics.tunnel.upstreamIssues} upstream issue · ${runtimeMetrics.tunnel.clientIssues} client issue. Cocokkan dengan Tunnel Diagnostics untuk melihat pool/target yang dominan.`,
          tone:
            tunnelFailureTotal >= 10 ||
            (runtimeMetrics.requests.tunnelTotal > 0 &&
              tunnelFailureTotal / runtimeMetrics.requests.tunnelTotal >= 0.5)
              ? 'critical'
              : 'warning',
          href: '/app/analytics?trafficType=tunnel&tunnelPhase=issues',
        })
      }

      if (observedGap >= 5) {
        alerts.push({
          title: `${observedGap} runtime failure belum sampai tahap quarantine`,
          detail: `${runtimeMetrics.runtimeFailures.observedTotal} observed vs ${runtimeMetrics.runtimeFailures.quarantinedTotal} quarantined. Bisa berarti threshold/window masih terlalu longgar atau failure tersebar lintas proxy sebelum memenuhi syarat quarantine.`,
          tone: observedGap >= 10 ? 'warning' : 'info',
          href: '/app/runtime/quarantine',
        })
      }

      if (runtimeQuarantine.active24h > 0 && !runtimeMetrics.config.runtimeAutoRecheckEnabled) {
        alerts.push({
          title: 'Runtime auto recheck sedang nonaktif',
          detail:
            'Masih ada proxy aktif di runtime quarantine, tetapi policy auto recheck saat ini disabled. Proxy akan menunggu recheck manual sampai config diaktifkan lagi.',
          tone: 'warning',
          href: '/app/tools/logs?sourceType=proxy_list_bulk&trigger=runtime_auto_recheck',
        })
      }
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
    if (!runtimeResolutionSupported) {
      alerts.push({
        title: 'Migration runtime quarantine resolution belum dijalankan',
        detail:
          'Dashboard tetap berjalan dalam mode kompatibilitas, tetapi count resolved dan audit resolved-by-run belum aktif sampai migration health_results diterapkan.',
        tone: 'warning',
        href: '/app/runtime/quarantine',
      })
    }
    if (runtimeQuarantine.active24h > 0) {
      alerts.push({
        title: `${runtimeQuarantine.active24h} proxy masih aktif di runtime quarantine`,
        detail: `${runtimeQuarantine.timeout24h} timeout · ${runtimeQuarantine.unhealthy24h} unhealthy · ${runtimeQuarantine.resolved24h} resolved dalam 24 jam`,
        tone:
          runtimeQuarantine.timeout24h > 0 || runtimeQuarantine.active24h >= 5
            ? 'critical'
            : 'warning',
        href: '/app/runtime/quarantine',
      })
    } else if (runtimeResolutionSupported && runtimeQuarantine.resolved24h > 0) {
      alerts.push({
        title: `${runtimeQuarantine.resolved24h} runtime quarantine sudah auto-resolved`,
        detail:
          'Recheck runtime berhasil menormalkan proxy yang sempat di-quarantine dalam 24 jam terakhir.',
        tone: 'info',
        href: '/app/runtime/quarantine?resolution=resolved',
      })
    }
    if (runtimeQuarantine.autoRecheck.error24h > 0) {
      alerts.push({
        title: `${runtimeQuarantine.autoRecheck.error24h} runtime auto recheck gagal`,
        detail:
          'Periksa health-check logs untuk melihat run auto recheck yang gagal publish atau gagal validasi runtime quarantine.',
        tone: 'warning',
        href: '/app/tools/logs?sourceType=proxy_list_bulk&trigger=runtime_auto_recheck',
      })
    }
    if (tunnelDiagnostics.failedConnect24h > 0 || tunnelDiagnostics.upstreamIssues24h > 0) {
      alerts.push({
        title: `${tunnelDiagnostics.failedConnect24h + tunnelDiagnostics.upstreamIssues24h} tunnel issue terdeteksi`,
        detail: `${tunnelDiagnostics.failedConnect24h} upstream connect failed · ${tunnelDiagnostics.upstreamIssues24h} upstream stream issue · ${tunnelDiagnostics.clientIssues24h} client-side issue`,
        tone:
          tunnelDiagnostics.failedConnect24h > 0 || tunnelDiagnostics.upstreamIssues24h >= 5
            ? 'warning'
            : 'info',
        href: '/app/analytics?trafficType=tunnel&tunnelPhase=issues',
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
        tunnel: tunnelDiagnostics,
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
    const status = qs.status === 'timeout' || qs.status === 'unhealthy' ? String(qs.status) : null
    const resolution =
      qs.resolution === 'resolved' || qs.resolution === 'all' ? String(qs.resolution) : 'active'
    const search = qs.search ? String(qs.search).trim() : null
    const requestedListId = qs.listId ? Number(qs.listId) : null
    const requestedProxyEntryId = qs.proxyEntryId ? Number(qs.proxyEntryId) : null

    const allProxyLists = await ProxyList.query().where('team_id', team.id).orderBy('name', 'asc')

    const runtimeResolutionSupported = await this.hasRuntimeResolutionColumns()

    const selectedList = requestedListId
      ? (allProxyLists.find((list) => list.id === requestedListId) ?? null)
      : null

    const buildQuery = (applyResolution = true) => {
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

      if (applyResolution) {
        if (!runtimeResolutionSupported) {
          if (resolution === 'resolved') {
            query.whereRaw('1 = 0')
          }
        } else if (resolution === 'resolved') {
          query.whereNotNull('health_results.resolved_at')
        } else if (resolution !== 'all') {
          query.whereNull('health_results.resolved_at')
        }
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
        ...(runtimeResolutionSupported
          ? ['health_results.resolved_at', 'health_results.resolved_by_run_id']
          : [db.raw('NULL as resolved_at'), db.raw('NULL as resolved_by_run_id')]),
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

    const summaryRow = await buildQuery(false)
      .where('health_results.checked_at', '>=', last24h)
      .count('* as total')
      .select(
        ...this.runtimeSummarySelects(runtimeResolutionSupported),
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
        active24h: Number(summaryRow?.active_count ?? 0),
        resolved24h: Number(summaryRow?.resolved_count ?? 0),
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
        status: status as 'timeout' | 'unhealthy' | null,
        resolution: resolution as 'active' | 'resolved' | 'all',
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
    const retryAttempt =
      typeof meta.retryAttempt === 'number'
        ? meta.retryAttempt
        : Number(meta.retryAttempt ?? (trigger === 'runtime_auto_recheck' ? 1 : 0)) || 0
    const retryMax =
      typeof meta.retryMax === 'number' ? meta.retryMax : Number(meta.retryMax ?? retryAttempt) || 0
    const title =
      trigger === 'import_auto_check' || trigger === 'scraper_auto_check'
        ? 'Auto health check'
        : trigger === 'runtime_auto_recheck'
          ? 'Runtime auto recheck'
          : trigger === 'runtime_quarantine_recheck'
            ? 'Runtime quarantine recheck'
            : trigger === 'manual_recheck'
              ? 'Proxy list recheck'
              : 'Manual health check'
    const detail = [
      listName,
      run.mode.toUpperCase(),
      trigger === 'runtime_auto_recheck' && retryAttempt > 0 && retryMax > 0
        ? `Attempt ${retryAttempt}/${retryMax}`
        : null,
    ]
      .filter(Boolean)
      .join(' | ')
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
          : trigger === 'runtime_auto_recheck'
            ? '/app/tools/logs?sourceType=proxy_list_bulk&trigger=runtime_auto_recheck'
            : trigger === 'runtime_quarantine_recheck'
              ? '/app/tools/logs?sourceType=proxy_list_bulk&trigger=runtime_quarantine_recheck'
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
      typeof meta.progressCurrent === 'number'
        ? meta.progressCurrent
        : run.status === 'success'
          ? 3
          : 1
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
      detail: [run.triggerType, run.checkMode.toUpperCase(), run.targetListName]
        .filter(Boolean)
        .join(' | '),
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

  private hasRuntimeResolutionColumns() {
    if (!this.runtimeResolutionColumnsPromise) {
      this.runtimeResolutionColumnsPromise = db
        .from('information_schema.columns')
        .where('table_schema', 'public')
        .where('table_name', 'health_results')
        .whereIn('column_name', ['resolved_at', 'resolved_by_run_id'])
        .count('* as total')
        .then((rows: any[]) => Number(rows[0]?.total ?? 0) >= 2)
        .catch(() => false)
    }

    return this.runtimeResolutionColumnsPromise
  }

  private runtimeSummarySelects(runtimeResolutionSupported: boolean) {
    if (!runtimeResolutionSupported) {
      return [db.raw('COUNT(*) as active_count'), db.raw('0 as resolved_count')]
    }

    return [
      db.raw(`
        SUM(
          CASE
            WHEN health_results.resolved_at IS NULL
            THEN 1 ELSE 0
          END
        ) as active_count
      `),
      db.raw(`
        SUM(
          CASE
            WHEN health_results.resolved_at IS NOT NULL
            THEN 1 ELSE 0
          END
        ) as resolved_count
      `),
    ]
  }

  private runtimeTimeoutCondition() {
    return `LOWER(COALESCE(health_results.error_message, '')) LIKE '%timeout%' OR LOWER(COALESCE(health_results.error_message, '')) LIKE '%deadline%'`
  }

  private tunnelIssuePhase(success: boolean, errorMessage: string | null) {
    const message = String(errorMessage ?? '').toLowerCase()
    if (!success) return 'upstream_connect_failed' as const
    if (message.includes('upstream stream error')) return 'tunnel_upstream_issue' as const
    if (message.includes('client stream error')) return 'tunnel_client_issue' as const
    if (message.includes('no payload')) return 'tunnel_no_payload' as const
    return 'tunnel_established' as const
  }

  private tunnelPhaseLabel(phase: string) {
    if (phase === 'upstream_connect_failed') return 'Upstream connect failed'
    if (phase === 'tunnel_upstream_issue') return 'Tunnel upstream issue'
    if (phase === 'tunnel_client_issue') return 'Tunnel client issue'
    if (phase === 'tunnel_no_payload') return 'Tunnel no payload'
    return 'Tunnel established'
  }

  private tunnelTargetLabel(row: {
    target_scheme?: string | null
    target_host?: string | null
    target_port?: number | string | null
  }) {
    const host = row.target_host ? String(row.target_host) : 'unknown-target'
    const port = row.target_port ? `:${row.target_port}` : ''
    const scheme = row.target_scheme ? `${row.target_scheme}://` : ''
    return `${scheme}${host}${port}`
  }

  private tunnelAnalyticsHref(phase: string, listId: number | null) {
    const params = new URLSearchParams({ trafficType: 'tunnel', tunnelPhase: phase })
    if (listId) params.set('listId', String(listId))
    return `/app/analytics?${params.toString()}`
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
      resolution: row.resolved_at ? ('resolved' as const) : ('active' as const),
      checkedAt:
        typeof row.checked_at === 'string'
          ? row.checked_at
          : new Date(row.checked_at).toISOString(),
      resolvedAt: !row.resolved_at
        ? null
        : typeof row.resolved_at === 'string'
          ? row.resolved_at
          : new Date(row.resolved_at).toISOString(),
      resolvedByRunId: row.resolved_by_run_id ? Number(row.resolved_by_run_id) : null,
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
