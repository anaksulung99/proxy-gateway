import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { updateOwnProfiileValidator, updateProfilePasswordValidator } from '#validators/user'

export default class TeamsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('profile/index', {})
  }

  async update({ auth, request, response, session }: HttpContext) {
    try {
      const id = auth.user?.id
      if (!id) {
        return response.unauthorized()
      }

      const payload = await request.validateUsing(updateOwnProfiileValidator(id))

      const user = await User.query().where('id', id).firstOrFail()
      user
        .merge({
          fullName: payload.fullName,
          email: payload.email,
        })
        .save()
    } catch (error) {
      session.flash('error', 'Profile update failed')
      return response.redirect().back()
    }

    session.flash('success', 'Profile updated')
    return response.redirect().back()
  }
  async password({ auth, request, response, session }: HttpContext) {
    try {
      const id = auth.user?.id
      if (!id) {
        return response.unauthorized()
      }

      const payload = await request.validateUsing(updateProfilePasswordValidator)

      const user = await User.query().where('id', id).firstOrFail()
      user
        .merge({
          password: payload.password,
        })
        .save()
    } catch (error) {
      session.flash('error', 'Password update failed')
      return response.redirect().back()
    }

    session.flash('success', 'Password updated')
    return response.redirect().back()
  }
}
