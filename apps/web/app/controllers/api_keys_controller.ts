import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ApiKey from '#models/api_key'
import Team from '#models/team'
import { createApiKeyValidator, teamQuotaValidator, keyQuotaValidator } from '#validators/api_key'
import type { HttpContext } from '@adonisjs/core/http'

const MB = 1024 * 1024

export default class ApiKeysController {
  private serialize(key: ApiKey, bytesThisMonth: number) {
    return {
      id: key.id,
      name: key.name,
      tokenPrefix: key.tokenPrefix,
      lastUsedAt: key.lastUsedAt?.toISO() ?? null,
      revokedAt: key.revokedAt?.toISO() ?? null,
      createdAt: key.createdAt?.toISO() ?? null,
      monthlyQuotaBytes: key.monthlyQuotaBytes ? Number(key.monthlyQuotaBytes) : null,
      bytesThisMonth,
    }
  }

  /**
   * GET /app/settings/api-keys — keys + per-key and team bandwidth this month.
   */
  async index({ inertia, team }: HttpContext) {
    const keys = await ApiKey.query().where('team_id', team.id).orderBy('id', 'desc')
    const monthStart = DateTime.now().startOf('month').toSQL()!

    // Per-key bytes this month.
    const perKeyRows = await db
      .from('proxy_usage_logs')
      .where('team_id', team.id)
      .whereNotNull('api_key_id')
      .where('requested_at', '>=', monthStart)
      .select('api_key_id')
      .sum('response_bytes as bytes')
      .groupBy('api_key_id')
    const byKey = new Map<number, number>()
    for (const r of perKeyRows) byKey.set(Number(r.api_key_id), Number(r.bytes ?? 0))

    // Team total bytes this month.
    const teamRow = await db
      .from('proxy_usage_logs')
      .where('team_id', team.id)
      .where('requested_at', '>=', monthStart)
      .sum('response_bytes as bytes')
      .first()

    const teamModel = await Team.find(team.id)

    return inertia.render(
      'settings/api_keys' as never,
      {
        keys: keys.map((k) => this.serialize(k, byKey.get(k.id) ?? 0)),
        gateway: { host: env.get('GATEWAY_HOST', '127.0.0.1:8000') },
        team: {
          monthlyQuotaBytes: teamModel?.monthlyQuotaBytes
            ? Number(teamModel.monthlyQuotaBytes)
            : null,
          bytesThisMonth: Number(teamRow?.bytes ?? 0),
        },
      } as never
    )
  }

  /**
   * POST /app/settings/api-keys — create a key (optional monthly quota).
   */
  async store({ request, response, team, auth, session }: HttpContext) {
    const { name, monthlyQuotaMb } = await request.validateUsing(createApiKeyValidator)
    const user = auth.getUserOrFail()
    const { token, tokenHash, tokenPrefix } = ApiKey.generate()

    await ApiKey.create({
      teamId: team.id,
      userId: user.id,
      name,
      tokenHash,
      tokenPrefix,
      monthlyQuotaBytes: monthlyQuotaMb ? monthlyQuotaMb * MB : null,
    })

    session.flash('newApiKey', { name, token })
    session.flash('success', `API key "${name}" created`)
    return response.redirect().back()
  }

  /**
   * POST /app/settings/api-keys/:id/quota — set a key's monthly quota (MB).
   */
  async updateQuota({ params, request, response, team, session }: HttpContext) {
    const key = await ApiKey.query().where('team_id', team.id).where('id', params.id).firstOrFail()
    const { monthlyQuotaMb } = await request.validateUsing(keyQuotaValidator)
    key.monthlyQuotaBytes = monthlyQuotaMb ? monthlyQuotaMb * MB : null
    await key.save()
    session.flash('success', `Quota updated for "${key.name}"`)
    return response.redirect().back()
  }

  /**
   * POST /app/settings/team-quota — set the team's monthly bandwidth quota (GB).
   */
  async updateTeamQuota({ request, response, team, session }: HttpContext) {
    const { monthlyQuotaGb } = await request.validateUsing(teamQuotaValidator)
    const teamModel = await Team.findOrFail(team.id)
    teamModel.monthlyQuotaBytes = monthlyQuotaGb ? Math.round(monthlyQuotaGb * 1024 * MB) : null
    await teamModel.save()
    session.flash('success', 'Team bandwidth quota updated')
    return response.redirect().back()
  }

  /**
   * DELETE /app/settings/api-keys/:id — revoke (soft) a key.
   */
  async revoke({ params, response, team, session }: HttpContext) {
    const key = await ApiKey.query().where('team_id', team.id).where('id', params.id).firstOrFail()
    if (!key.revokedAt) {
      key.revokedAt = DateTime.now()
      await key.save()
    }
    session.flash('success', `API key "${key.name}" revoked`)
    return response.redirect().back()
  }
}
