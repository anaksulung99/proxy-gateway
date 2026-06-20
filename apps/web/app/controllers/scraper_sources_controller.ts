/* eslint-disable prettier/prettier */
import ScraperSource from '#models/scraper_source'
import ScraperRun from '#models/scraper_run'
import ProxyList from '#models/proxy_list'
import scraperClient from '#services/scraper_client_service'
import scraperPipeline from '#services/scraper_pipeline_service'
import type { CheckMode } from '#services/health_check_client_service'
import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { deleteRunsValidator } from '#validators/scraper_run'

const updateSourceValidator = vine.create({
  proxyListId: vine.number().positive().nullable().optional(),
  isEnabled: vine.boolean().optional(),
  scheduleCron: vine.string().trim().maxLength(120).nullable().optional(),
})

const runSourceValidator = vine.create({
  mode: vine.enum(['request', 'playwright', 'crawlee'] as const).optional(),
})

export default class ScraperSourcesController {
  /**
   * GET /app/scraper — provision the known sources for the team (idempotent)
   * and list them with their target list.
   */
  async index({ inertia, request, team }: HttpContext) {
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    await scraperPipeline.provisionSources(team.id)

    const availableSources = new Set(await scraperClient.listSources())
    const sources = await ScraperSource.query()
      .where('team_id', team.id)
      .whereIn(
        'source_key',
        scraperPipeline.getKnownSources().map((s) => s.key)
      )
      .orderBy('name', 'asc')

    const lists = await ProxyList
      .query()
      .where('team_id', team.id)
      .orderBy('name', 'asc')

    const allRecentRuns = await scraperPipeline.listRecentRuns(team.id, 6)

    const total = allRecentRuns.length
    const start = (page - 1) * perPage
    const recentRuns = {
      data: allRecentRuns.slice(start, start + perPage),
      total,
      page,
      perPage,
      lastPage: Math.ceil(total / perPage)
    }

    return inertia.render(
      'scraper/index' as never,
      {
        sources: sources.map((s) => ({
          ...s.serialize(),
          availability: availableSources.has(s.sourceKey) ? 'available' : 'unreachable',
          cronLabel: scraperPipeline.cronLabel(s.scheduleCron),
        })),
        lists: lists.map((l) => ({ id: l.id, name: l.name })),
        overview: {
          totalSources: sources.length,
          enabledSources: sources.filter((source) => source.isEnabled).length,
          configuredSources: sources.filter((source) => source.proxyListId).length,
          availableSources: sources.filter((source) => availableSources.has(source.sourceKey))
            .length,
        },
        recentRuns,
      } as never
    )
  }

  /**
   * GET /app/scraper/logs — list the runs.
   */
  async logs({ inertia, request, team }: HttpContext) {
    const qs = request.qs()
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    const status = qs.status ? String(qs.status) : null
    const triggerType = qs.triggerType ? String(qs.triggerType) : null
    const sourceKey = qs.sourceKey ? String(qs.sourceKey) : null

    const query = ScraperRun.query().where('team_id', team.id).orderBy('started_at', 'desc')
    if (status) query.where('status', status)
    if (triggerType) query.where('trigger_type', triggerType)
    if (sourceKey) query.where('source_key', sourceKey)

    const runs = await query.paginate(page, perPage)
    runs.baseUrl(request.url())

    const sourceKeys = await ScraperRun.query()
      .where('team_id', team.id)
      .distinct('source_key')
      .orderBy('source_key', 'asc')

    return inertia.render(
      'scraper/logs' as never,
      {
        runs: {
          ...runs.serialize(),
          data: runs.all().map((run) => scraperPipeline.serializeRun(run)),
        },
        filters: { status, triggerType, sourceKey },
        sourceKeys: sourceKeys.map((row) => row.sourceKey),
      } as never
    )
  }

  /**
   * PATCH /app/scraper/:id — set target list / enabled.
   */
  async update({ params, request, response, team, session }: HttpContext) {
    const source = await ScraperSource.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()
    const payload = await request.validateUsing(updateSourceValidator)

    if (payload.proxyListId !== undefined) source.proxyListId = payload.proxyListId
    if (payload.isEnabled !== undefined) source.isEnabled = payload.isEnabled
    if (payload.scheduleCron !== undefined) source.scheduleCron = payload.scheduleCron || null
    await source.save()

    session.flash('success', 'Source updated')
    return response.redirect().back()
  }

  /**
   * POST /app/scraper/:id/run — scrape the source and import into its target
   * list (which auto-enqueues health checks).
   */
  async run({ params, request, response, team, session }: HttpContext) {
    const source = await ScraperSource.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()
    const payload = await request.validateUsing(runSourceValidator)
    const mode: CheckMode = payload.mode ?? 'request'

    if (!source.proxyListId) {
      session.flash('error', `Pick a target list for "${source.name}" first`)
      return response.redirect().back()
    }
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', source.proxyListId)
      .first()
    if (!list) {
      session.flash('error', 'Target list not found')
      return response.redirect().back()
    }

    try {
      const summary = await scraperPipeline.runSource(source, list, {
        requestedMode: mode,
        triggerType: 'manual',
      })
      session.flash('scraperRunSummary', summary)
      session.flash(
        'success',
        `${source.name}: scraped ${summary.scrapedTotal} → imported ${summary.created} new, ${summary.updated} updated into "${list.name}" with ${mode} check`
      )
    } catch (err) {
      session.flash('error', (err as Error).message)
      return response.redirect().back()
    }
    return response.redirect().back()
  }

  /**
   * POST /app/scraper/logs/run — scrape the enabled sources and import into their target
   * list (which auto-enqueues health checks).
   */
  async runEnabled({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(runSourceValidator)
    const mode: CheckMode = payload.mode ?? 'request'

    const sources = await ScraperSource.query()
      .where('team_id', team.id)
      .where('is_enabled', true)
      .whereNotNull('proxy_list_id')
      .orderBy('name', 'asc')

    if (sources.length === 0) {
      session.flash('error', 'No enabled scraper sources with a target list were found')
      return response.redirect().back()
    }

    const lists = await ProxyList.query().where('team_id', team.id)
    const listsById = new Map(lists.map((list) => [list.id, list]))
    const results = []
    let failed = 0

    for (const source of sources) {
      const targetList = source.proxyListId ? listsById.get(source.proxyListId) : null
      if (!targetList) continue

      try {
        results.push(
          await scraperPipeline.runSource(source, targetList, {
            requestedMode: mode,
            triggerType: 'batch',
          })
        )
      } catch {
        failed++
      }
    }

    if (results.length === 0) {
      session.flash(
        'error',
        failed > 0
          ? 'All enabled scraper runs failed. Check the run history for details.'
          : 'Enabled sources were found, but none had a valid target list'
      )
      return response.redirect().back()
    }

    const summary = scraperPipeline.summarizeBatch(results, mode)
    session.flash('scraperRunSummary', summary)
    session.flash(
      'success',
      `Batch scrape finished: ${summary.completedSources} sources succeeded, ${summary.totalCreated} new, ${summary.totalUpdated} updated, ${summary.totalEnqueued} queued for ${mode} checks` +
      (failed > 0 ? `, ${failed} failed` : '')
    )
    return response.redirect().back()
  }

  /**
   * POST /app/scraper/logs/delete — delete the selected runs.
   */
  async deleteMany({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(deleteRunsValidator)
    await ScraperRun.query()
      .where('team_id', team.id)
      .whereIn('id', payload.ids)
      .delete()
    session.flash('success', 'Selected runs deleted')
    return response.redirect().back()
  }
}
