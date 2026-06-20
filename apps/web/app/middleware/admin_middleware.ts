import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()

    await user.load('role')
    if (user.role?.name !== 'admin') {
      return ctx.response.forbidden({ message: 'Administrator access is required' })
    }

    return next()
  }
}
