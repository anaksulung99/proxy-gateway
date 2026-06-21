import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export interface ProxyEngineRuntimeStatus {
  status: string
  service: string
  env: string
  gatewayPort: string
  adminPort: string
  workers: number
  internalAuthEnabled: boolean
  cacheSize: number
  usageDropped: number
  uptimeSeconds: number
  metrics: {
    requests: {
      total: number
      success: number
      failed: number
      tunnelTotal: number
      directTotal: number
      responseBytes: number
      avgDurationMs: number
      successRate: number
    }
    tunnel: {
      established: number
      connectFailed: number
      upstreamIssues: number
      clientIssues: number
      noPayload: number
    }
    runtimeFailures: {
      observedTotal: number
      quarantinedTotal: number
      timeoutObserved: number
      timeoutQuarantined: number
      unhealthyObserved: number
      unhealthyQuarantined: number
    }
    config: {
      reloadsTotal: number
      runtimeFailureThreshold: number
      runtimeFailureWindowSec: number
      runtimeAutoRecheckEnabled: boolean
      runtimeAutoRecheckDelaySec: number
      runtimeAutoRecheckMaxAttempts: number
      runtimeAutoRetryDelaySec: number
    }
  }
  timestamp: string
}

function adminBaseUrl() {
  return env.get('PROXY_ENGINE_ADMIN_URL', 'http://127.0.0.1:8001')
}

function internalSecret() {
  return env.get('INTERNAL_API_SECRET')
}

export class ProxyEngineClientService {
  isConfigured() {
    return Boolean(adminBaseUrl()) && Boolean(internalSecret())
  }

  private headers() {
    const secret = internalSecret()
    return secret ? { 'X-Internal-Secret': secret, 'Content-Type': 'application/json' } : null
  }

  async fetchRuntimeStatus(): Promise<
    | {
        ok: true
        configured: true
        runtime: ProxyEngineRuntimeStatus
      }
    | {
        ok: false
        configured: boolean
        error: string
      }
  > {
    const headers = this.headers()
    if (!headers) {
      return {
        ok: false,
        configured: false,
        error: 'INTERNAL_API_SECRET belum dikonfigurasi',
      }
    }

    try {
      const response = await fetch(`${adminBaseUrl()}/runtime`, {
        method: 'GET',
        headers,
      })
      if (!response.ok) {
        return {
          ok: false,
          configured: true,
          error: `proxy-engine admin merespons ${response.status}`,
        }
      }

      const runtime = (await response.json()) as ProxyEngineRuntimeStatus
      return { ok: true, configured: true, runtime }
    } catch (error) {
      logger.warn({ err: error }, 'proxy-engine runtime request failed')
      return {
        ok: false,
        configured: true,
        error: 'proxy-engine admin tidak bisa dihubungi',
      }
    }
  }

  async invalidateLists(listIds: number[]) {
    const headers = this.headers()
    if (!headers || listIds.length === 0) return { ok: false as const, skipped: true }

    try {
      const response = await fetch(`${adminBaseUrl()}/cache/invalidate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ listIds }),
      })
      if (!response.ok) {
        logger.warn({ status: response.status, listIds }, 'proxy-engine cache invalidation failed')
        return { ok: false as const, skipped: false }
      }
      const body = (await response.json()) as { invalidated: number; cacheSize: number }
      return { ok: true as const, skipped: false, ...body }
    } catch (error) {
      logger.warn({ err: error, listIds }, 'proxy-engine cache invalidation failed')
      return { ok: false as const, skipped: false }
    }
  }
}

export default new ProxyEngineClientService()
