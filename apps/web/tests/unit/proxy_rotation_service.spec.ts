import { test } from '@japa/runner'
import rotationService from '#services/proxy_rotation_service'

test.group('Proxy rotation service', () => {
  test('normalize sticky payload and clean targeting filters', ({ assert }) => {
    const normalized = rotationService.normalize({
      rotationType: 'sticky',
      protocol: 'https',
      stickyDurationMinutes: 0,
      intervalMinutes: 99,
      geoTarget: 'us',
      excludeCountries: ['cn', 'CN', 'br', 'bad'],
      excludeAsn: [13335, 13335, -1, 15169],
    })

    assert.deepEqual(normalized, {
      rotationType: 'sticky',
      protocol: 'https',
      stickyDurationMinutes: 1,
      intervalMinutes: null,
      geoTarget: 'US',
      excludeCountries: ['CN', 'BR'],
      excludeAsn: [13335, 15169],
    })
  })

  test('normalize interval payload and discard sticky-only values', ({ assert }) => {
    const normalized = rotationService.normalize({
      rotationType: 'interval',
      protocol: 'any',
      stickyDurationMinutes: 180,
      intervalMinutes: 45,
      geoTarget: null,
      excludeCountries: [],
      excludeAsn: [],
    })

    assert.equal(normalized.stickyDurationMinutes, null)
    assert.equal(normalized.intervalMinutes, 30)
    assert.equal(normalized.geoTarget, null)
  })

  test('build human readable summary', ({ assert }) => {
    const summary = rotationService.summarize({
      rotationType: 'per_request',
      protocol: 'socks5',
      geoTarget: 'ID',
      excludeCountries: ['CN', 'RU'],
      excludeAsn: [13335],
    })

    assert.equal(summary.modeLabel, 'Rotating per request')
    assert.equal(summary.protocolLabel, 'SOCKS5')
    assert.equal(summary.geoLabel, 'Default geo ID')
    assert.equal(summary.exclusionsLabel, '2 excluded countries + 1 excluded ASN')
    assert.include(summary.description, 'Change IP on every request')
  })
})
