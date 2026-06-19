import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import scraperScheduler from '#services/scraper_scheduler_service'

test.group('Scraper scheduler service', () => {
  test('matches common cron expressions', ({ assert }) => {
    const sample = DateTime.fromISO('2026-06-19T10:30:00Z')

    assert.isTrue(scraperScheduler.cronMatches('*/15 * * * *', sample))
    assert.isTrue(scraperScheduler.cronMatches('30 10 * * 5', sample))
    assert.isTrue(scraperScheduler.cronMatches('0,30 10 * * *', sample))
    assert.isFalse(scraperScheduler.cronMatches('15 10 * * *', sample))
    assert.isFalse(scraperScheduler.cronMatches('invalid cron', sample))
  })

  test('isDue prevents duplicate execution in the same minute', ({ assert }) => {
    const now = DateTime.fromISO('2026-06-19T10:30:45Z')

    assert.isTrue(scraperScheduler.isDue('*/15 * * * *', now, null))
    assert.isFalse(
      scraperScheduler.isDue('*/15 * * * *', now, DateTime.fromISO('2026-06-19T10:30:05Z'))
    )
    assert.isTrue(
      scraperScheduler.isDue('*/15 * * * *', now, DateTime.fromISO('2026-06-19T10:15:00Z'))
    )
  })
})
