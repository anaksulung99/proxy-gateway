import { test } from '@japa/runner'
import scraperPipeline from '#services/scraper_pipeline_service'

test.group('Scraper pipeline service', () => {
  test('build import blob preserves protocol per proxy', ({ assert }) => {
    const raw = scraperPipeline.buildImportBlob([
      { host: '1.1.1.1', port: '80', protocol: 'http', country: 'US' },
      { host: '2.2.2.2', port: '1080', protocol: 'socks5', country: 'ID' },
    ])

    assert.equal(raw, 'http://1.1.1.1:80\nsocks5://2.2.2.2:1080')
  })

  test('cron label falls back to manual mode', ({ assert }) => {
    assert.equal(scraperPipeline.cronLabel(null), 'Manual only')
    assert.equal(scraperPipeline.cronLabel('  */15 * * * *  '), '*/15 * * * *')
  })

  test('summarize batch aggregates source run results', ({ assert }) => {
    const summary = scraperPipeline.summarizeBatch(
      [
        {
          runId: 101,
          sourceId: 1,
          sourceKey: 'proxyscrape',
          sourceName: 'ProxyScrape',
          targetListId: 10,
          targetListName: 'Pool A',
          requestedMode: 'request',
          triggerType: 'batch',
          status: 'success',
          scrapedTotal: 120,
          created: 80,
          updated: 10,
          invalid: 5,
          duplicatesInBatch: 2,
          enqueued: 90,
          bySource: { proxyscrape: { count: 120 } },
          finishedAt: new Date().toISOString(),
          errorMessage: null,
        },
        {
          runId: 102,
          sourceId: 2,
          sourceKey: 'geonode',
          sourceName: 'Geonode',
          targetListId: 11,
          targetListName: 'Pool B',
          requestedMode: 'request',
          triggerType: 'batch',
          status: 'success',
          scrapedTotal: 40,
          created: 25,
          updated: 5,
          invalid: 1,
          duplicatesInBatch: 0,
          enqueued: 30,
          bySource: { geonode: { count: 40 } },
          finishedAt: new Date().toISOString(),
          errorMessage: null,
        },
      ],
      'request'
    )

    assert.equal(summary.totalSources, 2)
    assert.equal(summary.completedSources, 2)
    assert.equal(summary.totalScraped, 160)
    assert.equal(summary.totalCreated, 105)
    assert.equal(summary.totalUpdated, 15)
    assert.equal(summary.totalInvalid, 6)
    assert.equal(summary.totalEnqueued, 120)
  })
})
