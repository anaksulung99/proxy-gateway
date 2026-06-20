import env from '#start/env'
import { DateTime } from 'luxon'
import ApiKey from '#models/api_key'
import { createApiKeyValidator } from '#validators/api_key'
import type { HttpContext } from '@adonisjs/core/http'
import type { InferSharedProps } from '@adonisjs/inertia/types'

type ApiKeysPageProps = InferSharedProps<{
  keys: Array<{
    id: number
    name: string
    tokenPrefix: string
    lastUsedAt: string | null
    revokedAt: string | null
    createdAt: string | null
  }>
  gateway: {
    host: string
  }
}>

export default class ApiKeysController {
  private serialize(key: ApiKey) {
    return {
      id: key.id,
      name: key.name,
      tokenPrefix: key.tokenPrefix,
      lastUsedAt: key.lastUsedAt?.toISO() ?? null,
      revokedAt: key.revokedAt?.toISO() ?? null,
      createdAt: key.createdAt?.toISO() ?? null,
    }
  }

  /**
   * GET /app/settings/api-keys — list the team's gateway keys.
   */
  async index({ inertia, team }: HttpContext) {
    const keys = await ApiKey.query().where('team_id', team.id).orderBy('id', 'desc')

    // @ts-expect-error Inertia props are not typed.
    const props: ApiKeysPageProps = {
      keys: keys.map((k) => this.serialize(k)),
      gateway: { host: env.get('GATEWAY_HOST', '127.0.0.1:8000') },
    }

    return inertia.render('settings/api_keys', props)
  }

  /**
   * POST /app/settings/api-keys — create a key; the plaintext is shown once.
   */
  async store({ request, response, team, auth, session }: HttpContext) {
    const { name } = await request.validateUsing(createApiKeyValidator)
    const user = auth.getUserOrFail()
    const { token, tokenHash, tokenPrefix } = ApiKey.generate()

    await ApiKey.create({
      teamId: team.id,
      userId: user.id,
      name,
      tokenHash,
      tokenPrefix,
    })

    // Plaintext is flashed once — never retrievable again.
    session.flash('newApiKey', { name, token })
    session.flash('success', `API key "${name}" created`)
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
