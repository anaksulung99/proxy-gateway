import { ProxyImportService } from '#services/proxy_import_service'
import healthClient from '#services/health_check_client_service'
import HealthCheckRun from '#models/health_check_run'
import { toolsCheckValidator, deleteToolsCheckValidator } from '#validators/tools_check'
import type { HttpContext } from '@adonisjs/core/http'

export default class ToolsCheckerController {
  private async paginateRecentRuns(teamId: number, page: number, perPage: number) {
    const runs = await HealthCheckRun.query()
      .where('team_id', teamId)
      .orderBy('started_at', 'desc')
      .paginate(page, perPage)

    return {
      data: runs.all().map((run) => healthClient.serializeRun(run)),
      meta: runs.getMeta(),
    }
  }

  /**
   * GET /app/tools — external proxy checker.
   */
  async index({ inertia, request, team }: HttpContext) {
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [5, 10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    return inertia.render(
      'tools/index' as never,
      {
        results: null,
        input: null,
        ...(await this.paginateRecentRuns(team.id, page, perPage)),
      } as never
    )
  }

  /**
   * GET /app/tools/logs — show the health check logs.
   */
  async logs({ inertia, request, team }: HttpContext) {
    const qs = request.qs()
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [5, 10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    const status = qs.status ? String(qs.status) : null
    const sourceType = qs.sourceType ? String(qs.sourceType) : null

    const query = HealthCheckRun.query().where('team_id', team.id).orderBy('started_at', 'desc')

    if (status) query.where('status', status)
    if (sourceType) query.where('source_type', sourceType)

    const runs = await query.paginate(page, perPage)
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
      return inertia.render(
        'tools/index' as never,
        {
          results: null,
          input: { mode: payload.mode, targetUrl: payload.targetUrl ?? '', raw: payload.raw },
          ...(await this.paginateRecentRuns(team.id, 1, 10)),
        } as never
      )
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
      return inertia.render(
        'tools/index' as never,
        {
          results: null,
          input: { mode: payload.mode, targetUrl: payload.targetUrl ?? '', raw: payload.raw },
          ...(await this.paginateRecentRuns(team.id, 1, 10)),
        } as never
      )
    }

    const healthy = results.filter((r) => r.healthy).length
    session.flash(
      'success',
      `Checked ${results.length} proxies — ${healthy} healthy, ${invalid.length} invalid skipped`
    )

    return inertia.render(
      'tools/index' as never,
      {
        results,
        input: { mode: payload.mode, targetUrl: payload.targetUrl ?? '', raw: payload.raw },
        ...(await this.paginateRecentRuns(team.id, 1, 10)),
      } as never
    )
  }

  /**
   * DELETE /app/tools/check — delete the specified health check runs.
   */
  async deleteMany({ request, response, team }: HttpContext) {
    const payload = await request.validateUsing(deleteToolsCheckValidator)
    await HealthCheckRun.query().where('team_id', team.id).whereIn('id', payload.ids).delete()
    return response.redirect().back()
  }
}
