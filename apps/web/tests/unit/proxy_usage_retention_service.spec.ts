import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import proxyUsageRetention from '#services/proxy_usage_retention_service'

test.group('Proxy usage retention service', () => {
  test('normalizes retention days with safe minimum', ({ assert }) => {
    assert.equal(proxyUsageRetention.normalizeRetentionDays(30), 30)
    assert.equal(proxyUsageRetention.normalizeRetentionDays(0), 1)
    assert.equal(proxyUsageRetention.normalizeRetentionDays(-7), 1)
    assert.equal(proxyUsageRetention.normalizeRetentionDays(7.9), 7)
  })

  test('normalizes tick seconds with safe minimum', ({ assert }) => {
    assert.equal(proxyUsageRetention.normalizeTickSeconds(3600), 3600)
    assert.equal(proxyUsageRetention.normalizeTickSeconds(30), 300)
    assert.equal(proxyUsageRetention.normalizeTickSeconds(-1), 300)
    assert.equal(proxyUsageRetention.normalizeTickSeconds(600.8), 600)
  })

  test('builds UTC cutoff using configured retention window', ({ assert }) => {
    const now = DateTime.fromISO('2026-06-20T12:00:00Z') as DateTime
    const original = proxyUsageRetention.retentionDays

    try {
      proxyUsageRetention.retentionDays = () => 30
      const cutoff = proxyUsageRetention.cutoffFor(now)

      assert.equal(cutoff.toISO(), '2026-05-21T12:00:00.000Z')
    } finally {
      proxyUsageRetention.retentionDays = original
    }
  })
})
