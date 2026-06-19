import db from '@adonisjs/lucid/services/db'
import ProxyEntry from '#models/proxy_entry'
import type ProxyList from '#models/proxy_list'
import publisher, { type HealthCheckJob } from '#services/rabbitmq_publisher_service'
import type { CheckMode } from '#services/health_check_client_service'
import proxyEngineClient from '#services/proxy_engine_client_service'

export interface ParsedProxy {
  host: string
  port: number
  protocol: 'http' | 'https' | 'socks5'
  username: string | null
  password: string | null
}

export interface ParseResult {
  valid: ParsedProxy[]
  invalid: { line: string; reason: string }[]
  duplicatesInBatch: number
}

export interface ImportSummary {
  totalLines: number
  parsed: number
  invalid: number
  invalidSamples: { line: string; reason: string }[]
  duplicatesInBatch: number
  created: number
  updated: number
  enqueued: number
}

const HOST_RE = /^[a-zA-Z0-9._-]+$/

function normalizeProtocol(scheme: string): ParsedProxy['protocol'] | null {
  const s = scheme.toLowerCase()
  if (s === 'http') return 'http'
  if (s === 'https') return 'https'
  if (s.startsWith('socks')) return 'socks5' // socks/socks4/socks5/socks5h -> socks5
  return null
}

export class ProxyImportService {
  /**
   * Parse a raw, newline-separated blob of proxies. Supported per-line formats:
   *   host:port
   *   host:port:user:pass
   *   user:pass@host:port
   *   scheme://host:port
   *   scheme://user:pass@host:port
   * Lines starting with `#` or `//` and blank lines are ignored.
   */
  static parse(raw: string, defaultProtocol: ParsedProxy['protocol'] = 'http'): ParseResult {
    const valid: ParsedProxy[] = []
    const invalid: { line: string; reason: string }[] = []
    const seen = new Set<string>()
    let duplicatesInBatch = 0

    const lines = raw.split(/\r?\n/)
    for (const original of lines) {
      const line = original.trim()
      if (!line || line.startsWith('#') || line.startsWith('//')) continue

      const parsed = this.parseLine(line, defaultProtocol)
      if ('reason' in parsed) {
        invalid.push({ line, reason: parsed.reason })
        continue
      }

      const key = `${parsed.host}:${parsed.port}`
      if (seen.has(key)) {
        duplicatesInBatch++
        continue
      }
      seen.add(key)
      valid.push(parsed)
    }

    return { valid, invalid, duplicatesInBatch }
  }

  private static parseLine(
    line: string,
    defaultProtocol: ParsedProxy['protocol']
  ): ParsedProxy | { reason: string } {
    let protocol = defaultProtocol
    let rest = line

    // scheme://
    const schemeMatch = rest.match(/^([a-zA-Z][a-zA-Z0-9]*):\/\//)
    if (schemeMatch) {
      const proto = normalizeProtocol(schemeMatch[1])
      if (!proto) return { reason: `unsupported scheme "${schemeMatch[1]}"` }
      protocol = proto
      rest = rest.slice(schemeMatch[0].length)
    }

    let username: string | null = null
    let password: string | null = null
    let hostPort = rest

    if (rest.includes('@')) {
      // user:pass@host:port  (split on the last '@')
      const at = rest.lastIndexOf('@')
      const cred = rest.slice(0, at)
      hostPort = rest.slice(at + 1)
      const ci = cred.indexOf(':')
      if (ci === -1) return { reason: 'credentials must be user:pass' }
      username = cred.slice(0, ci)
      password = cred.slice(ci + 1)
    }

    const parts = hostPort.split(':')
    let host: string
    let portStr: string

    if (username === null && parts.length === 4) {
      // host:port:user:pass
      host = parts[0]
      portStr = parts[1]
      username = parts[2]
      password = parts[3]
    } else if (parts.length === 2) {
      host = parts[0]
      portStr = parts[1]
    } else {
      return { reason: 'expected host:port' }
    }

    if (!host || !HOST_RE.test(host)) return { reason: `invalid host "${host}"` }
    const port = Number(portStr)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { reason: `invalid port "${portStr}"` }
    }

    return {
      host,
      port,
      protocol,
      username: username || null,
      password: password || null,
    }
  }

  /**
   * Parse + persist into a proxy list. New entries are created, existing ones
   * (same host:port in the list) get their protocol/credentials refreshed.
   * Affected entries are enqueued for a health check.
   */
  async importToList(
    list: ProxyList,
    raw: string,
    defaultProtocol: ParsedProxy['protocol'] = 'http',
    source: 'import' | 'scrape' = 'import',
    autoCheckMode: CheckMode = 'request'
  ): Promise<ImportSummary> {
    const totalLines = raw.split(/\r?\n/).filter((l) => {
      const t = l.trim()
      return t && !t.startsWith('#') && !t.startsWith('//')
    }).length

    const { valid, invalid, duplicatesInBatch } = ProxyImportService.parse(raw, defaultProtocol)

    const affected: ProxyEntry[] = []
    let created = 0
    let updated = 0

    await db.transaction(async (trx) => {
      const existing = await ProxyEntry.query({ client: trx })
        .where('proxy_list_id', list.id)
        .select('id', 'host', 'port', 'protocol', 'username', 'password')
      const existingMap = new Map(existing.map((e) => [`${e.host}:${e.port}`, e]))

      const toCreate: Partial<ProxyEntry>[] = []
      for (const p of valid) {
        const key = `${p.host}:${p.port}`
        const found = existingMap.get(key)
        if (found) {
          found.protocol = p.protocol
          found.username = p.username
          found.password = p.password
          found.source = source
          found.useTransaction(trx)
          await found.save()
          updated++
          affected.push(found)
        } else {
          toCreate.push({
            proxyListId: list.id,
            host: p.host,
            port: p.port,
            protocol: p.protocol,
            username: p.username,
            password: p.password,
            status: 'unknown',
            source,
          })
        }
      }

      if (toCreate.length > 0) {
        const createdRows = await ProxyEntry.createMany(toCreate, { client: trx })
        created = createdRows.length
        affected.push(...createdRows)
      }
    })

    // Fire-and-forget health-check enqueue (fail-soft).
    const jobs: HealthCheckJob[] = affected.map((e) => ({
      proxyEntryId: e.id,
      host: e.host,
      port: e.port,
      protocol: e.protocol,
      username: e.username,
      password: e.password,
      mode: autoCheckMode,
    }))
    const { enqueued } = await publisher.enqueueHealthChecks(jobs)
    await proxyEngineClient.invalidateLists([list.id])

    return {
      totalLines,
      parsed: valid.length,
      invalid: invalid.length,
      invalidSamples: invalid.slice(0, 10),
      duplicatesInBatch,
      created,
      updated,
      enqueued,
    }
  }
}

export default new ProxyImportService()
