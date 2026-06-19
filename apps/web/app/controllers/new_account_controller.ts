import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { sendVerificationEmail } from '#services/auth_mail_service'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth, session }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const user = await User.create({ ...payload })

    await auth.use('web').login(user)
    try {
      await sendVerificationEmail(user, `${request.protocol()}://${request.host()}`)
      session.flash('success', 'Account created. Check your inbox to verify your email.')
    } catch {
      session.flash('error', 'Account created, but the verification email could not be sent. Try resending it.')
    }
    response.redirect().toPath('/verify-email')
  }
}
