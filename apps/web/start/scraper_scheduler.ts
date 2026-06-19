import env from '#start/env'
import scraperScheduler from '#services/scraper_scheduler_service'

if (env.get('NODE_ENV') !== 'test') {
  scraperScheduler.start()
}
