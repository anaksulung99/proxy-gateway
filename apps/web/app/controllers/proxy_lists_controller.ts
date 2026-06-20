import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import ProxyList from '#models/proxy_list'
import RotationConfig from '#models/rotation_config'
import ApiKey from '#models/api_key'
import importService from '#services/proxy_import_service'
import proxyEngineClient from '#services/proxy_engine_client_service'
import rotationService from '#services/proxy_rotation_service'
import {
  createProxyListValidator,
  updateProxyListValidator,
  deleteProxyListValidator,
} from '#validators/proxy_list'
import { rotationConfigValidator } from '#validators/rotation_config'
import { proxyImportValidator } from '#validators/proxy_import'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProxyListsController {
  /**
   * GET /app/proxy-lists — all lists for the current team with counts.
   */
  async index({ request, inertia, team }: HttpContext) {
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    const [lists, listStats, entryStats] = await Promise.all([
      ProxyList.query()
        .where('team_id', team.id)
        .preload('rotationConfig')
        .withCount('entries')
        .orderBy('id', 'desc')
        .paginate(page, perPage),
      db
        .from('proxy_lists')
        .where('team_id', team.id)
        .select(
          db.raw('COUNT(*)::int AS total'),
          db.raw('COUNT(*) FILTER (WHERE is_active = true)::int AS active')
        )
        .first(),
      db
        .from('proxy_entries')
        .innerJoin('proxy_lists', 'proxy_lists.id', 'proxy_entries.proxy_list_id')
        .where('proxy_lists.team_id', team.id)
        .select(
          db.raw('COUNT(*)::int AS total'),
          db.raw("COUNT(*) FILTER (WHERE proxy_entries.status = 'healthy')::int AS healthy")
        )
        .first(),
    ])

    const rows = lists.all()
    const ids = rows.map((l) => l.id)
    const healthyMap = new Map<number, number>()
    if (ids.length) {
      const healthyRows = await db
        .from('proxy_entries')
        .whereIn('proxy_list_id', ids)
        .where('status', 'healthy')
        .select('proxy_list_id')
        .count('* as c')
        .groupBy('proxy_list_id')
      for (const r of healthyRows) healthyMap.set(Number(r.proxy_list_id), Number(r.c))
    }

    return inertia.render(
      'proxy-lists/index' as never,
      {
        lists: {
          data: rows.map((l) => ({
            ...l.serialize(),
            entriesCount: Number(l.$extras.entries_count ?? 0),
            healthyCount: healthyMap.get(l.id) ?? 0,
            rotationSummary: rotationService.summarize(l.rotationConfig),
          })),
          meta: lists.getMeta(),
        },
        stats: {
          totalLists: Number(listStats?.total ?? 0),
          activeLists: Number(listStats?.active ?? 0),
          totalEntries: Number(entryStats?.total ?? 0),
          healthyEntries: Number(entryStats?.healthy ?? 0),
        },
      } as never
    )
  }

  /**
   * POST /app/proxy-lists — create a list + default rotation config.
   */
  async store({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(createProxyListValidator)

    const exists = await ProxyList.query()
      .where('team_id', team.id)
      .where('name', payload.name)
      .first()
    if (exists) {
      session.flash('error', `A list named "${payload.name}" already exists`)
      return response.redirect().back()
    }

    const list = await ProxyList.create({
      teamId: team.id,
      name: payload.name,
      description: payload.description ?? null,
      isActive: payload.isActive ?? true,
    })

    await RotationConfig.create({
      proxyListId: list.id,
      rotationType: 'per_request',
      protocol: 'any',
    })
    await proxyEngineClient.invalidateLists([list.id])

    session.flash('success', `List "${list.name}" created`)
    return response.redirect().toRoute('proxy-lists.show', { id: list.id })
  }

  /**
   * GET /app/proxy-lists/:id — detail + filtered, paginated entries.
   */
  async show({ params, request, inertia, team }: HttpContext) {
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .preload('rotationConfig')
      .firstOrFail()

    const qs = request.qs()
    const page = Number(qs.page ?? 1)
    const perPage = Math.min(Number(qs.perPage ?? 50), 200)
    const filters = {
      status: qs.status ?? null,
      country: qs.country ? String(qs.country).toUpperCase() : null,
      protocol: qs.protocol ?? null,
      asn: qs.asn ? Number(qs.asn) : null,
      search: qs.search ?? null,
    }

    const entriesQuery = list.related('entries').query().orderBy('id', 'desc')
    if (filters.status) entriesQuery.where('status', filters.status)
    if (filters.country) entriesQuery.where('country_code', filters.country)
    if (filters.protocol) entriesQuery.where('protocol', filters.protocol)
    if (filters.asn) entriesQuery.where('asn_number', filters.asn)
    if (filters.search) entriesQuery.whereILike('host', `%${filters.search}%`)

    const entries = await entriesQuery.paginate(page, perPage)
    entries.baseUrl(request.url())

    const statusRows = await db
      .from('proxy_entries')
      .where('proxy_list_id', list.id)
      .select('status')
      .count('* as c')
      .groupBy('status')
    const stats = { total: 0, healthy: 0, unhealthy: 0, timeout: 0, unknown: 0 } as Record<
      string,
      number
    >
    for (const r of statusRows) {
      const c = Number(r.c)
      stats[r.status] = c
      stats.total += c
    }

    return inertia.render(
      'proxy-lists/show' as never,
      {
        list: list.serialize(),
        rotationConfig: list.rotationConfig?.serialize() ?? null,
        rotationSummary: rotationService.summarize(list.rotationConfig),
        gateway: {
          host: env.get('GATEWAY_HOST', '127.0.0.1:8000'),
          socksHost: env.get('GATEWAY_SOCKS_HOST', '127.0.0.1:1080'),
          username: `list-${list.id}`,
          hasActiveKey: !!(await ApiKey.query()
            .where('team_id', team.id)
            .whereNull('revoked_at')
            .first()),
        },
        entries: entries.serialize(),
        filters,
        stats,
      } as never
    )
  }

  /**
   * PATCH /app/proxy-lists/:id — rename / toggle active.
   */
  async update({ params, request, response, team, session }: HttpContext) {
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()
    const payload = await request.validateUsing(updateProxyListValidator)

    if (payload.name && payload.name !== list.name) {
      const exists = await ProxyList.query()
        .where('team_id', team.id)
        .where('name', payload.name)
        .whereNot('id', list.id)
        .first()
      if (exists) {
        session.flash('error', `A list named "${payload.name}" already exists`)
        return response.redirect().back()
      }
    }

    list.merge({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    })
    await list.save()
    await proxyEngineClient.invalidateLists([list.id])
    session.flash('success', 'List updated')
    return response.redirect().back()
  }

  /**
   * DELETE /app/proxy-lists/:id
   */
  async destroy({ params, response, team, session }: HttpContext) {
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()
    const listId = list.id
    await list.delete()
    await proxyEngineClient.invalidateLists([listId])
    session.flash('success', `List "${list.name}" deleted`)
    return response.redirect().toRoute('proxy-lists.index')
  }

  /**
   * PUT /app/proxy-lists/:id/rotation — sticky/per_request/interval + filters.
   */
  async updateRotation({ params, request, response, team, session }: HttpContext) {
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()
    const payload = await request.validateUsing(rotationConfigValidator)
    const normalized = rotationService.normalize(payload)

    await RotationConfig.updateOrCreate(
      { proxyListId: list.id },
      {
        rotationType: normalized.rotationType,
        protocol: normalized.protocol,
        stickyDurationMinutes: normalized.stickyDurationMinutes,
        intervalMinutes: normalized.intervalMinutes,
        geoTarget: normalized.geoTarget,
        excludeCountries: normalized.excludeCountries,
        excludeAsn: normalized.excludeAsn,
      }
    )
    await proxyEngineClient.invalidateLists([list.id])

    session.flash('success', 'Rotation config saved')
    return response.redirect().back()
  }

  /**
   * POST /app/proxy-lists/:id/import — import own proxies (raw blob).
   */
  async import({ params, request, response, team, session }: HttpContext) {
    const list = await ProxyList.query()
      .where('team_id', team.id)
      .where('id', params.id)
      .firstOrFail()
    const payload = await request.validateUsing(proxyImportValidator)

    const summary = await importService.importToList(
      list,
      payload.raw,
      payload.defaultProtocol ?? 'http'
    )

    session.flash(
      'success',
      `Imported: ${summary.created} new, ${summary.updated} updated` +
        (summary.invalid ? `, ${summary.invalid} invalid` : '') +
        (summary.duplicatesInBatch ? `, ${summary.duplicatesInBatch} dupes skipped` : '')
    )
    session.flash('importSummary', summary)
    return response.redirect().back()
  }

  /**
   * DELETE /app/proxy-lists/bulk — delete multiple lists.
   */
  async bulkDestroy({ request, response, team, session }: HttpContext) {
    const payload = await request.validateUsing(deleteProxyListValidator)
    const lists = await ProxyList.query().where('team_id', team.id).whereIn('id', payload.ids)
    const ownedIds = lists.map((list) => list.id)

    if (ownedIds.length === 0) {
      session.flash('error', 'No matching lists found')
      return response.redirect().back()
    }

    await ProxyList.query().where('team_id', team.id).whereIn('id', ownedIds).delete()
    await proxyEngineClient.invalidateLists(ownedIds)
    session.flash('success', `Deleted ${ownedIds.length} lists`)
    return response.redirect().toRoute('proxy-lists.index')
  }
}
