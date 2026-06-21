import type { HttpContext } from '@adonisjs/core/http'
import { contactValidator } from '#validators/home'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'

export default class HomeController {
  async index({ inertia }: HttpContext) {
    return inertia.render('home/index', {})
  }
  async about({ inertia }: HttpContext) {
    return inertia.render('home/about', {})
  }
  async contact({ inertia }: HttpContext) {
    return inertia.render('home/contact', {})
  }
  async pricing({ inertia }: HttpContext) {
    return inertia.render('home/pricing', {})
  }
  async terms({ inertia }: HttpContext) {
    return inertia.render('home/terms', {})
  }
  async privacy({ inertia }: HttpContext) {
    return inertia.render('home/privacy', {})
  }
  async faqs({ inertia }: HttpContext) {
    return inertia.render('home/faqs', {})
  }
  async storeContact({ request, response }: HttpContext) {
    const payload = await request.validateUsing(contactValidator)

    try {
      await mail.send((message) => {
        message
          .to(env.get('SMTP_FROM_EMAIL') || 'welcome@example.com')
          .from(env.get('SMTP_USER') || 'welcome@example.com')
          .subject('New Mailer from Residential Proxy!')
          .htmlView('emails/welcome', { payload })
      })
    } catch (error) {
      return response.status(500).json({ error: 'Failed to create contact' })
    }
    return response.status(201).json({ message: 'Contact created successfully' })
  }
}
