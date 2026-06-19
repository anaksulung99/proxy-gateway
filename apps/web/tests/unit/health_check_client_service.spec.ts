import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import healthClient from '#services/health_check_client_service'

test.group('Health check client service', () => {
  test('summarize results groups healthy, unhealthy, timeout, and invalid counts', ({ assert }) => {
    const summary = healthClient.summarizeResults(
      [
        {
          proxyId: '1',
          healthy: true,
          latencyMs: 120,
          returnedIp: '1.1.1.1',
          statusCode: 200,
          error: '',
          mode: 'request',
        },
        {
          proxyId: '2',
          healthy: false,
          latencyMs: 0,
          returnedIp: '',
          statusCode: 0,
          error: 'timeout while connecting',
          mode: 'request',
        },
        {
          proxyId: '3',
          healthy: false,
          latencyMs: 0,
          returnedIp: '',
          statusCode: 403,
          error: 'forbidden',
          mode: 'request',
        },
      ],
      2
    )

    assert.deepEqual(summary, {
      checked: 3,
      healthy: 1,
      unhealthy: 1,
      timeout: 1,
      invalid: 2,
    })
  })

  test('serialize run returns ISO timestamps and summary fields', ({ assert }) => {
    const startedAt = DateTime.fromISO('2026-06-19T10:00:00Z')
    const finishedAt = DateTime.fromISO('2026-06-19T10:01:00Z')

    const serialized = healthClient.serializeRun({
      id: 7,
      sourceType: 'tools',
      status: 'success',
      mode: 'playwright',
      targetUrl: 'https://api.ipify.org',
      totalInputs: 10,
      checkedCount: 8,
      healthyCount: 5,
      unhealthyCount: 2,
      timeoutCount: 1,
      invalidCount: 2,
      errorMessage: null,
      meta: { sampleResults: [] },
      proxyListId: null,
      startedAt,
      finishedAt,
    } as any)

    assert.equal(serialized.id, 7)
    assert.equal(serialized.sourceType, 'tools')
    assert.equal(serialized.mode, 'playwright')
    assert.equal(serialized.startedAt, startedAt.toISO())
    assert.equal(serialized.finishedAt, finishedAt.toISO())
  })
})
