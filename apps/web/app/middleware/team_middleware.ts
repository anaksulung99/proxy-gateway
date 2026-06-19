import Team from '#models/team'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Ensures the authenticated user always has a "current team" resolved and
 * attached to the request context. If the user has no team yet, a personal
 * team is created on the fly. Must run after the `auth` middleware.
 */
export default class TeamMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()

    let team: Team | null = null
    if (user.currentTeamId) {
      team = await Team.find(user.currentTeamId)
    }

    if (!team) {
      // fall back to any team the user owns, otherwise create one
      team = await Team.query().where('owner_id', user.id).orderBy('id', 'asc').first()
      if (!team) {
        team = await Team.create({ name: 'Personal', ownerId: user.id })
      }
      user.currentTeamId = team.id
      await user.save()
    }

    ctx.team = team

    return next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    team: Team
  }
}
