import { ProxyImportService } from '#services/proxy_import_service'
import healthClient from '#services/health_check_client_service'
import HealthCheckRun from '#models/health_check_run'
import { toolsCheckValidator } from '#validators/tools_check'
import type { HttpContext } from '@adonisjs/core/http'

export default class ToolsCheckerController {
  /**
   * GET /app/tools — external proxy checker.
   */
  async index({ inertia, team }: HttpContext) {
    const recentRuns = await healthClient.listRecentRuns(team.id, 6)
    return inertia.render(
      'tools/index' as never,
      { results: null, input: null, recentRuns } as never
    )
  }

  async logs({ inertia, request, team }: HttpContext) {
    const qs = request.qs()
    const page = Number(qs.page ?? 1)
    const status = qs.status ? String(qs.status) : null
    const sourceType = qs.sourceType ? String(qs.sourceType) : null

    const query = HealthCheckRun.query()
      .where('team_id', team.id)
      .orderBy('started_at', 'desc')

    if (status) query.where('status', status)
    if (sourceType) query.where('source_type', sourceType)

    const runs = await query.paginate(page, 20)
    runs.baseUrl(request.url())

    return inertia.render(
      'tools/show' as never,
      {
        runs: {
          ...runs.serialize(),
          data: runs.all().map((run) => healthClient.serializeRun(run)),
        },
        filters: { status, sourceType },
      } as never
    )
  }

  /**
   * POST /app/tools/check — parse the pasted blob and run checks via the Go
   * health-checker. Results are returned to the page, not stored.
   */
  async check({ request, inertia, session, team }: HttpContext) {
    const payload = await request.validateUsing(toolsCheckValidator)

    const { valid, invalid } = ProxyImportService.parse(payload.raw, 'http')
    if (valid.length === 0) {
      session.flash('error', 'No valid proxies found in the input')
      return inertia.render('tools/index' as never, {
        results: null,
        input: { mode: payload.mode, targetUrl: payload.targetUrl ?? '', raw: payload.raw },
        recentRuns: await healthClient.listRecentRuns(team.id, 6),
      } as never)
    }

    let results
    try {
      const tracked = await healthClient.runTrackedCheck(
        valid.map((p, i) => ({
          proxyId: String(i),
          host: p.host,
          port: p.port,
          protocol: p.protocol,
          username: p.username,
          password: p.password,
        })),
        {
          teamId: team.id,
          sourceType: 'tools',
          mode: payload.mode,
          targetUrl: payload.targetUrl ?? '',
          invalidCount: invalid.length,
        }
      )
      const raw = tracked.results
      // attach the original host:port for display
      results = raw.map((r, i) => ({
        ...r,
        label: `${valid[i].host}:${valid[i].port}`,
        protocol: valid[i].protocol,
      }))
      session.flash('healthCheckRunSummary', tracked.summary)
    } catch (err) {
      session.flash('error', (err as Error).message)
      return inertia.render('tools/index' as never, {
        results: null,
        input: { mode: payload.mode, targetUrl: payload.targetUrl ?? '', raw: payload.raw },
        recentRuns: await healthClient.listRecentRuns(team.id, 6),
      } as never)
    }

    const healthy = results.filter((r) => r.healthy).length
    session.flash(
      'success',
      `Checked ${results.length} proxies — ${healthy} healthy, ${invalid.length} invalid skipped`
    )

    return inertia.render('tools/index' as never, {
      results,
      input: { mode: payload.mode, targetUrl: payload.targetUrl ?? '', raw: payload.raw },
      recentRuns: await healthClient.listRecentRuns(team.id, 6),
    } as never)
  }
}
