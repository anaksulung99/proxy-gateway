import env from '#start/env'
import scraperScheduler from '#services/scraper_scheduler_service'
import app from '@adonisjs/core/services/app'

if (app.getEnvironment() === 'web' && env.get('NODE_ENV') !== 'test') {
  scraperScheduler.start()
}
