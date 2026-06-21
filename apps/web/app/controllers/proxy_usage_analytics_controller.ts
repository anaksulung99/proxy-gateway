import db from '@adonisjs/lucid/services/db'
import ProxyList from '#models/proxy_list'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { deleteProxyListValidator } from '#validators/proxy_list'

const ALLOWED_HOURS = [24, 168, 720] as const
type TrendUnit = 'hour' | 'day'
type AnalyticsStatus = 'all' | 'success' | 'failed'
type AnalyticsTrafficType = 'all' | 'direct' | 'tunnel'
type AnalyticsTunnelPhase =
  | 'all'
  | 'issues'
  | 'upstream_connect_failed'
  | 'tunnel_upstream_issue'
  | 'tunnel_client_issue'
  | 'tunnel_no_payload'
  | 'tunnel_established'
type AnalyticsFilters = {
  hours: number
  listId: number | null
  status: AnalyticsStatus
  trafficType: AnalyticsTrafficType
  tunnelPhase: AnalyticsTunnelPhase
  since: DateTime
}
type TrendPoint = {
  label: string
  bucketStart: string | null
  requestCount: number
  successfulRequests: number
  failedRequests: number
}

function trendKey(value: DateTime, unit: TrendUnit) {
  return unit === 'hour' ? value.toFormat("yyyy-LL-dd'T'HH") : value.toFormat('yyyy-LL-dd')
}

function trendLabel(value: DateTime, unit: TrendUnit) {
  return unit === 'hour' ? value.toFormat('HH:mm') : value.toFormat('dd LLL')
}

function bucketDateTime(value: unknown) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: 'utc' })
  }

  if (typeof value === 'string') {
    return DateTime.fromISO(value, { zone: 'utc' }).isValid
      ? DateTime.fromISO(value, { zone: 'utc' })
      : DateTime.fromSQL(value, { zone: 'utc' })
  }

  return DateTime.invalid('Invalid trend bucket')
}

function parseFilters(qs: Record<string, unknown>): AnalyticsFilters {
  const hours = ALLOWED_HOURS.includes(Number(qs.hours) as any) ? Number(qs.hours) : 24
  const listId = qs.listId ? Number(qs.listId) : null
  const status: AnalyticsStatus =
    qs.status === 'failed' || qs.status === 'success' ? qs.status : 'all'
  const trafficType: AnalyticsTrafficType =
    qs.trafficType === 'direct' || qs.trafficType === 'tunnel' ? qs.trafficType : 'all'
  const tunnelPhaseOptions: AnalyticsTunnelPhase[] = [
    'all',
    'issues',
    'upstream_connect_failed',
    'tunnel_upstream_issue',
    'tunnel_client_issue',
    'tunnel_no_payload',
    'tunnel_established',
  ]
  const tunnelPhase = tunnelPhaseOptions.includes(qs.tunnelPhase as AnalyticsTunnelPhase)
    ? (qs.tunnelPhase as AnalyticsTunnelPhase)
    : 'all'

  return {
    hours,
    listId,
    status,
    trafficType,
    tunnelPhase,
    since: DateTime.now().minus({ hours }),
  }
}

function applyUsageFilters(query: any, teamId: number, filters: AnalyticsFilters) {
  query
    .where('proxy_usage_logs.team_id', teamId)
    .where('proxy_usage_logs.requested_at', '>=', filters.since.toSQL()!)

  if (filters.listId) query.where('proxy_usage_logs.proxy_list_id', filters.listId)
  if (filters.status === 'success') query.where('proxy_usage_logs.success', true)
  if (filters.status === 'failed') query.where('proxy_usage_logs.success', false)
  if (filters.trafficType === 'tunnel') query.where('proxy_usage_logs.is_tunnel', true)
  if (filters.trafficType === 'direct') query.where('proxy_usage_logs.is_tunnel', false)
  applyTunnelPhaseFilter(query, filters.tunnelPhase)
  return query
}

function buildLogsBaseQuery(teamId: number, filters: AnalyticsFilters) {
  return applyUsageFilters(
    db
      .from('proxy_usage_logs')
      .leftJoin('proxy_lists', 'proxy_usage_logs.proxy_list_id', 'proxy_lists.id')
      .select(
        'proxy_usage_logs.id',
        'proxy_usage_logs.request_method',
        'proxy_usage_logs.target_host',
        'proxy_usage_logs.target_port',
        'proxy_usage_logs.target_scheme',
        'proxy_usage_logs.is_tunnel',
        'proxy_usage_logs.success',
        'proxy_usage_logs.status_code',
        'proxy_usage_logs.attempt_count',
        'proxy_usage_logs.duration_ms',
        'proxy_usage_logs.response_bytes',
        'proxy_usage_logs.session_key',
        'proxy_usage_logs.country_override',
        'proxy_usage_logs.selected_protocol',
        'proxy_usage_logs.selected_country',
        'proxy_usage_logs.selected_asn',
        'proxy_usage_logs.error_message',
        'proxy_usage_logs.requested_at',
        'proxy_usage_logs.proxy_list_id',
        'proxy_lists.name as proxy_list_name'
      )
      .orderBy('proxy_usage_logs.requested_at', 'desc'),
    teamId,
    filters
  )
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function resolveTunnelPhase(row: any) {
  if (!row.is_tunnel) return 'request'
  if (!row.success) return 'upstream_connect_failed'

  const message = typeof row.error_message === 'string' ? row.error_message.toLowerCase() : ''
  if (message.includes('upstream stream error')) return 'tunnel_upstream_issue'
  if (message.includes('client stream error')) return 'tunnel_client_issue'
  if (message.includes('no payload')) return 'tunnel_no_payload'
  return 'tunnel_established'
}

function tunnelPhaseLabel(phase: string) {
  if (phase === 'upstream_connect_failed') return 'Upstream connect failed'
  if (phase === 'tunnel_upstream_issue') return 'Tunnel upstream issue'
  if (phase === 'tunnel_client_issue') return 'Tunnel client issue'
  if (phase === 'tunnel_no_payload') return 'Tunnel no payload'
  if (phase === 'tunnel_established') return 'Tunnel established'
  return 'Direct request'
}

function applyTunnelPhaseFilter(query: any, phase: AnalyticsTunnelPhase) {
  if (phase === 'all') return query

  if (phase === 'issues') {
    return query.where((builder: any) => {
      builder
        .where((issueQuery: any) => {
          issueQuery.where('proxy_usage_logs.is_tunnel', true).where('proxy_usage_logs.success', false)
        })
        .orWhere((issueQuery: any) => {
          issueQuery
            .where('proxy_usage_logs.is_tunnel', true)
            .where('proxy_usage_logs.success', true)
            .where((textQuery: any) => {
              textQuery
                .whereILike('proxy_usage_logs.error_message', '%upstream stream error%')
                .orWhereILike('proxy_usage_logs.error_message', '%client stream error%')
                .orWhereILike('proxy_usage_logs.error_message', '%no payload%')
            })
        })
    })
  }

  if (phase === 'upstream_connect_failed') {
    return query.where('proxy_usage_logs.is_tunnel', true).where('proxy_usage_logs.success', false)
  }

  if (phase === 'tunnel_established') {
    return query
      .where('proxy_usage_logs.is_tunnel', true)
      .where('proxy_usage_logs.success', true)
      .where((builder: any) => {
        builder
          .whereNull('proxy_usage_logs.error_message')
          .orWhere('proxy_usage_logs.error_message', 'Tunnel established')
      })
  }

  if (phase === 'tunnel_upstream_issue') {
    return query
      .where('proxy_usage_logs.is_tunnel', true)
      .where('proxy_usage_logs.success', true)
      .whereILike('proxy_usage_logs.error_message', '%upstream stream error%')
  }

  if (phase === 'tunnel_client_issue') {
    return query
      .where('proxy_usage_logs.is_tunnel', true)
      .where('proxy_usage_logs.success', true)
      .whereILike('proxy_usage_logs.error_message', '%client stream error%')
  }

  if (phase === 'tunnel_no_payload') {
    return query
      .where('proxy_usage_logs.is_tunnel', true)
      .where('proxy_usage_logs.success', true)
      .whereILike('proxy_usage_logs.error_message', '%no payload%')
  }

  return query
}

export default class ProxyUsageAnalyticsController {
  async index({ inertia, request, team }: HttpContext) {
    const qs = request.qs()
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    const { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter, since } =
      parseFilters(qs)
    const trendUnit: TrendUnit = hours <= 24 ? 'hour' : 'day'
    const trendStart = since.startOf(trendUnit)
    const trendEnd = DateTime.now().startOf(trendUnit)
    const logsBaseQuery = buildLogsBaseQuery(team.id, {
      hours,
      listId,
      status,
      trafficType,
      tunnelPhase: tunnelPhaseFilter,
      since,
    })
    const logCountRow = await logsBaseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .count('* as total')
      .first()
    const logTotal = Number(logCountRow?.total ?? 0)
    const lastPage = Math.max(Math.ceil(logTotal / perPage), 1)
    const currentPage = Math.min(page, lastPage)

    const [overviewRows, topTargets, topPools, methods, trendRows, logRows, lists] =
      await Promise.all([
        applyUsageFilters(
          db
            .from('proxy_usage_logs')
            .count('* as total_requests')
            .select(
              db.raw('SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests'),
              db.raw('SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_requests')
            )
            .avg('duration_ms as avg_duration_ms')
            .sum('response_bytes as total_response_bytes'),
          team.id,
          { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter, since }
        ),
        applyUsageFilters(
          db
            .from('proxy_usage_logs')
            .select('target_host')
            .count('* as request_count')
            .avg('duration_ms as avg_duration_ms')
            .whereNotNull('target_host')
            .groupBy('target_host')
            .orderBy('request_count', 'desc')
            .limit(8),
          team.id,
          { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter, since }
        ),
        applyUsageFilters(
          db
            .from('proxy_usage_logs')
            .leftJoin('proxy_lists', 'proxy_usage_logs.proxy_list_id', 'proxy_lists.id')
            .select('proxy_usage_logs.proxy_list_id', 'proxy_lists.name as proxy_list_name')
            .count('* as request_count')
            .select(db.raw('SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests'))
            .avg('duration_ms as avg_duration_ms')
            .groupBy('proxy_usage_logs.proxy_list_id', 'proxy_lists.name')
            .orderBy('request_count', 'desc')
            .limit(8),
          team.id,
          { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter, since }
        ),
        applyUsageFilters(
          db
            .from('proxy_usage_logs')
            .select('request_method')
            .count('* as request_count')
            .groupBy('request_method')
            .orderBy('request_count', 'desc'),
          team.id,
          { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter, since }
        ),
        applyUsageFilters(
          db
            .from('proxy_usage_logs')
            .select(
              db.raw(`date_trunc('${trendUnit}', proxy_usage_logs.requested_at) as bucket_start`)
            )
            .count('* as request_count')
            .select(
              db.raw('SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_requests'),
              db.raw('SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_requests')
            )
            .groupByRaw(`date_trunc('${trendUnit}', proxy_usage_logs.requested_at)`)
            .orderBy('bucket_start', 'asc'),
          team.id,
          { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter, since }
        ),
        logsBaseQuery
          .clone()
          .offset((currentPage - 1) * perPage)
          .limit(perPage),
        ProxyList.query().where('team_id', team.id).orderBy('name', 'asc'),
      ])

    const overview = overviewRows[0]
    const totalRequests = Number(overview?.total_requests ?? 0)
    const successfulRequests = Number(overview?.successful_requests ?? 0)
    const failedRequests = Number(overview?.failed_requests ?? 0)
    const trendMap = new Map<
      string,
      { requestCount: number; successfulRequests: number; failedRequests: number }
    >(
      trendRows.map((row: any) => {
        const bucket = bucketDateTime(row.bucket_start)
        return [
          trendKey(bucket, trendUnit),
          {
            requestCount: Number(row.request_count ?? 0),
            successfulRequests: Number(row.successful_requests ?? 0),
            failedRequests: Number(row.failed_requests ?? 0),
          },
        ]
      })
    )
    const trend: TrendPoint[] = []
    for (
      let cursor = trendStart as DateTime;
      cursor <= trendEnd;
      cursor = cursor.plus(trendUnit === 'hour' ? { hours: 1 } : { days: 1 })
    ) {
      const key = trendKey(cursor, trendUnit)
      const current = trendMap.get(key)
      trend.push({
        label: trendLabel(cursor, trendUnit),
        bucketStart: cursor.toUTC().toISO(),
        requestCount: current?.requestCount ?? 0,
        successfulRequests: current?.successfulRequests ?? 0,
        failedRequests: current?.failedRequests ?? 0,
      })
    }

    return inertia.render(
      'analytics/index' as never,
      {
        filters: { hours, listId, status, trafficType, tunnelPhase: tunnelPhaseFilter },
        lists: lists.map((list) => ({ id: list.id, name: list.name })),
        trend: {
          unit: trendUnit,
          points: trend,
        },
        overview: {
          totalRequests,
          successfulRequests,
          failedRequests,
          successRate:
            totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
          avgDurationMs: Math.round(Number(overview?.avg_duration_ms ?? 0)),
          totalResponseBytes: Number(overview?.total_response_bytes ?? 0),
        },
        topTargets: topTargets.map((row: any) => ({
          targetHost: row.target_host,
          requestCount: Number(row.request_count ?? 0),
          avgDurationMs: Math.round(Number(row.avg_duration_ms ?? 0)),
        })),
        topPools: topPools.map((row: any) => {
          const requestCount = Number(row.request_count ?? 0)
          const successful = Number(row.successful_requests ?? 0)
          return {
            proxyListId: row.proxy_list_id ? Number(row.proxy_list_id) : null,
            proxyListName: row.proxy_list_name ?? 'Unknown list',
            requestCount,
            avgDurationMs: Math.round(Number(row.avg_duration_ms ?? 0)),
            successRate: requestCount > 0 ? Math.round((successful / requestCount) * 100) : 0,
          }
        }),
        methods: methods.map((row: any) => ({
          requestMethod: row.request_method,
          requestCount: Number(row.request_count ?? 0),
        })),
        logs: {
          data: logRows.map((row: any) => {
            const phase = resolveTunnelPhase(row)
            return {
              id: row.id,
              requestMethod: row.request_method,
              targetHost: row.target_host,
              targetPort: row.target_port,
              targetScheme: row.target_scheme,
              isTunnel: row.is_tunnel,
              success: row.success,
              statusCode: row.status_code,
              attemptCount: row.attempt_count,
              durationMs: row.duration_ms,
              responseBytes: Number(row.response_bytes ?? 0),
              sessionKey: row.session_key,
              countryOverride: row.country_override,
              selectedProtocol: row.selected_protocol,
              selectedCountry: row.selected_country,
              selectedAsn: row.selected_asn,
              errorMessage: row.error_message,
              requestedAt: row.requested_at,
              proxyListId: row.proxy_list_id,
              proxyListName: row.proxy_list_name,
              tunnelPhase: phase,
              tunnelPhaseLabel: tunnelPhaseLabel(phase),
            }
          }),
          meta: {
            total: logTotal,
            currentPage,
            lastPage,
            perPage,
          },
        },
      } as never
    )
  }

  async export({ request, response, team }: HttpContext) {
    const filters = parseFilters(request.qs())
    const rows = await buildLogsBaseQuery(team.id, filters).clone()

    const header = [
      'id',
      'requested_at',
      'proxy_list_id',
      'proxy_list_name',
      'request_method',
      'target_host',
      'target_port',
      'target_scheme',
      'is_tunnel',
      'success',
      'status_code',
      'attempt_count',
      'duration_ms',
      'response_bytes',
      'session_key',
      'country_override',
      'selected_protocol',
      'selected_country',
      'selected_asn',
      'error_message',
    ]

    const lines = rows.map((row: any) =>
      [
        row.id,
        row.requested_at,
        row.proxy_list_id,
        row.proxy_list_name,
        row.request_method,
        row.target_host,
        row.target_port,
        row.target_scheme,
        row.is_tunnel,
        row.success,
        row.status_code,
        row.attempt_count,
        row.duration_ms,
        row.response_bytes,
        row.session_key,
        row.country_override,
        row.selected_protocol,
        row.selected_country,
        row.selected_asn,
        row.error_message,
      ]
        .map(csvEscape)
        .join(',')
    )

    const listLabel = filters.listId ? `list-${filters.listId}` : 'all-pools'
    const safeName = `usage_logs_${filters.hours}h_${filters.status}_${listLabel}`
    response.header('Content-Type', 'text/csv; charset=utf-8')
    response.header('Content-Disposition', `attachment; filename="${safeName}.csv"`)
    return response.send([header.join(','), ...lines].join('\n'))
  }

  async deleteMany({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(deleteProxyListValidator)
    await ProxyList.query().where('team_id', team.id).whereIn('id', payload.ids).delete()
    session.flash('success', 'Selected proxy lists deleted')
    return response.redirect().back()
  }
}
