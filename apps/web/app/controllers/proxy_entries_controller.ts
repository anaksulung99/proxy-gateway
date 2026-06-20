import ProxyList from '#models/proxy_list'
import ProxyEntry from '#models/proxy_entry'
import healthClient from '#services/health_check_client_service'
import proxyEngineClient from '#services/proxy_engine_client_service'
import { bulkActionValidator, recheckBulkValidator } from '#validators/proxy_entry'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProxyEntriesController {
  /**
   * POST /app/proxy-entries/bulk — delete or re-check selected entries.
   */
  async bulk({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(bulkActionValidator)

    // ownership: the list must belong to the current team
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', payload.listId)
      .firstOrFail()

    const entries = await ProxyEntry.query()
      .where('proxy_list_id', list.id)
      .whereIn('id', payload.ids)

    if (entries.length === 0) {
      session.flash('error', 'No matching entries')
      return response.redirect().back()
    }

    if (payload.action === 'delete') {
      await ProxyEntry.query()
        .where('proxy_list_id', list.id)
        .whereIn(
          'id',
          entries.map((e) => e.id)
        )
        .delete()
      await proxyEngineClient.invalidateLists([list.id])
      session.flash('success', `Deleted ${entries.length} entries`)
      return response.redirect().back()
    }

    // recheck — run synchronously against the Go health-checker and persist
    try {
      const summary = await healthClient.checkEntries(entries, 'request', {
        teamId: team.id,
        proxyListId: list.id,
      })
      await proxyEngineClient.invalidateLists([list.id])
      session.flash('healthCheckRunSummary', {
        runId: summary.runId,
        sourceType: 'proxy_list_bulk',
        status: 'success',
        mode: summary.mode,
        targetUrl: summary.targetUrl,
        totalInputs: summary.checked + summary.invalid,
        checked: summary.checked,
        healthy: summary.healthy,
        unhealthy: summary.unhealthy,
        timeout: summary.timeout,
        invalid: summary.invalid,
        proxyListId: list.id,
        finishedAt: summary.finishedAt ?? new Date().toISOString(),
      })
      session.flash(
        'success',
        `Checked ${summary.checked}: ${summary.healthy} healthy, ${summary.unhealthy} unhealthy, ${summary.timeout} timeout`
      )
    } catch (err) {
      session.flash('error', (err as Error).message)
    }
    return response.redirect().back()
  }

  /**
   * GET /app/proxy-lists/:id/export — download proxies as txt or csv.
   * Query: format=txt|csv, creds=1, status, protocol, country
   */
  async export({ params, request, response, team }: HttpContext) {
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()

    const qs = request.qs()
    const format = qs.format === 'csv' ? 'csv' : 'txt'
    const withCreds = qs.creds === '1' || qs.creds === 'true'

    const query = list.related('entries').query().orderBy('id', 'asc')
    if (qs.status) query.where('status', qs.status)
    if (qs.protocol) query.where('protocol', qs.protocol)
    if (qs.country) query.where('country_code', String(qs.country).toUpperCase())
    const entries = await query

    let body: string
    let contentType: string
    if (format === 'csv') {
      const header =
        'host,port,protocol,username,password,country_code,asn_number,status,latency_ms'
      const rows = entries.map((e) =>
        [
          e.host,
          e.port,
          e.protocol,
          e.username ?? '',
          e.password ?? '',
          e.countryCode ?? '',
          e.asnNumber ?? '',
          e.status,
          e.latencyMs ?? '',
        ].join(',')
      )
      body = [header, ...rows].join('\n')
      contentType = 'text/csv'
    } else {
      body = entries
        .map((e) =>
          withCreds && e.username
            ? `${e.host}:${e.port}:${e.username}:${e.password ?? ''}`
            : `${e.host}:${e.port}`
        )
        .join('\n')
      contentType = 'text/plain'
    }

    const safeName = list.name.replace(/[^a-zA-Z0-9_-]+/g, '_')
    response.header('Content-Type', contentType)
    response.header(
      'Content-Disposition',
      `attachment; filename="${safeName}.${format === 'csv' ? 'csv' : 'txt'}"`
    )
    return response.send(body)
  }

  /**
   * Recheck all proxy list with status Timeout, Unhealthy or Unchecked
   */
  async reCheckBulk({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(recheckBulkValidator)

    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', payload.listId)
      .firstOrFail()

    const entries = await ProxyEntry.query()
      .where('proxy_list_id', list.id)
      .where('status', payload.status)

    if (entries.length === 0) {
      session.flash('error', `No ${payload.status} entries found in this list`)
      return response.redirect().back()
    }

    try {
      const summary = await healthClient.checkEntries(entries, 'request', {
        teamId: team.id,
        proxyListId: list.id,
      })
      await proxyEngineClient.invalidateLists([list.id])
      session.flash('healthCheckRunSummary', {
        runId: summary.runId,
        sourceType: 'proxy_list_bulk',
        status: 'success',
        mode: summary.mode,
        targetUrl: summary.targetUrl,
        totalInputs: summary.checked + summary.invalid,
        checked: summary.checked,
        healthy: summary.healthy,
        unhealthy: summary.unhealthy,
        timeout: summary.timeout,
        invalid: summary.invalid,
        proxyListId: list.id,
        finishedAt: summary.finishedAt ?? new Date().toISOString(),
      })
      session.flash(
        'success',
        `Checked ${summary.checked}: ${summary.healthy} healthy, ${summary.unhealthy} unhealthy, ${summary.timeout} timeout`
      )
    } catch (error) {
      session.flash('error', (error as Error).message)
    }

    return response.redirect().back()
  }
}
