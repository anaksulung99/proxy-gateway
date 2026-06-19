import type RotationConfig from '#models/rotation_config'

export type RotationMode = 'sticky' | 'per_request' | 'interval'
export type RotationProtocol = 'http' | 'https' | 'socks5' | 'any'

export interface RotationPayload {
  rotationType: RotationMode
  protocol: RotationProtocol
  stickyDurationMinutes?: number | null
  intervalMinutes?: number | null
  geoTarget?: string | null
  excludeCountries?: string[] | null
  excludeAsn?: number[] | null
}

export interface RotationSummary {
  modeLabel: string
  protocolLabel: string
  cadenceLabel: string
  geoLabel: string
  exclusionsLabel: string
  description: string
}

const MODE_LABELS: Record<RotationMode, string> = {
  sticky: 'Sticky session',
  per_request: 'Rotating per request',
  interval: 'Rotating by interval',
}

const PROTOCOL_LABELS: Record<RotationProtocol, string> = {
  any: 'Any protocol',
  http: 'HTTP',
  https: 'HTTPS',
  socks5: 'SOCKS5',
}

export class ProxyRotationService {
  normalize(payload: RotationPayload): Required<RotationPayload> {
    const rotationType = payload.rotationType
    const protocol = payload.protocol ?? 'any'
    const stickyDurationMinutes =
      rotationType === 'sticky' ? this.clamp(payload.stickyDurationMinutes ?? 30, 1, 1440) : null
    const intervalMinutes =
      rotationType === 'interval' ? this.clamp(payload.intervalMinutes ?? 10, 1, 30) : null
    const geoTarget = this.normalizeCountry(payload.geoTarget ?? null)
    const excludeCountries = this.normalizeCountries(payload.excludeCountries ?? [])
    const excludeAsn = this.normalizeAsn(payload.excludeAsn ?? [])

    return {
      rotationType,
      protocol,
      stickyDurationMinutes,
      intervalMinutes,
      geoTarget,
      excludeCountries,
      excludeAsn,
    }
  }

  summarize(config: Partial<RotationPayload> | RotationConfig | null | undefined): RotationSummary {
    const normalized = this.normalize({
      rotationType: (config?.rotationType as RotationMode | undefined) ?? 'per_request',
      protocol: (config?.protocol as RotationProtocol | undefined) ?? 'any',
      stickyDurationMinutes: config?.stickyDurationMinutes ?? null,
      intervalMinutes: config?.intervalMinutes ?? null,
      geoTarget: config?.geoTarget ?? null,
      excludeCountries: (config?.excludeCountries as string[] | null | undefined) ?? [],
      excludeAsn: (config?.excludeAsn as number[] | null | undefined) ?? [],
    })

    const cadenceLabel =
      normalized.rotationType === 'sticky'
        ? `${normalized.stickyDurationMinutes} minutes per sticky session`
        : normalized.rotationType === 'interval'
          ? `Change IP every ${normalized.intervalMinutes} minutes`
          : 'Change IP on every request'

    const geoLabel = normalized.geoTarget
      ? `Default geo ${normalized.geoTarget}`
      : 'No geo targeting'

    const exclusionParts: string[] = []
    if (normalized.excludeCountries && normalized.excludeCountries?.length > 0) {
      exclusionParts.push(`${normalized.excludeCountries.length} excluded countries`)
    }
    if (normalized.excludeAsn && normalized.excludeAsn?.length > 0) {
      exclusionParts.push(`${normalized.excludeAsn.length} excluded ASN`)
    }

    const exclusionsLabel = exclusionParts.length > 0 ? exclusionParts.join(' + ') : 'No exclusions'
    const description = [
      MODE_LABELS[normalized.rotationType],
      cadenceLabel,
      PROTOCOL_LABELS[normalized.protocol],
      geoLabel,
      exclusionsLabel,
    ].join(' · ')

    return {
      modeLabel: MODE_LABELS[normalized.rotationType],
      protocolLabel: PROTOCOL_LABELS[normalized.protocol],
      cadenceLabel,
      geoLabel,
      exclusionsLabel,
      description,
    }
  }

  private normalizeCountry(value: string | null): string | null {
    const normalized = value?.trim().toUpperCase() ?? ''
    return normalized.length === 2 ? normalized : null
  }

  private normalizeCountries(values: string[]): string[] {
    return [
      ...new Set(values.map((value) => this.normalizeCountry(value)).filter(Boolean)),
    ] as string[]
  }

  private normalizeAsn(values: number[]): number[] {
    return [
      ...new Set(
        values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      ),
    ]
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(Number(value), min), max)
  }
}

export default new ProxyRotationService()
