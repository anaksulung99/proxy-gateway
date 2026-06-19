import { DateTime } from 'luxon'
import Team from '#models/team'
import ProxyList from '#models/proxy_list'
import ProxyEntry from '#models/proxy_entry'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ProxyUsageLog extends BaseModel {
  static table = 'proxy_usage_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare teamId: number

  @column()
  declare proxyListId: number | null

  @column()
  declare proxyEntryId: number | null

  @column()
  declare requestMethod: string

  @column()
  declare targetHost: string | null

  @column()
  declare targetPort: number | null

  @column()
  declare targetScheme: string | null

  @column()
  declare isTunnel: boolean

  @column()
  declare success: boolean

  @column()
  declare statusCode: number | null

  @column()
  declare attemptCount: number

  @column()
  declare durationMs: number

  @column()
  declare responseBytes: number

  @column()
  declare sessionKey: string | null

  @column()
  declare countryOverride: string | null

  @column()
  declare selectedProtocol: string | null

  @column()
  declare selectedCountry: string | null

  @column()
  declare selectedAsn: number | null

  @column()
  declare errorMessage: string | null

  @column.dateTime()
  declare requestedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => ProxyList)
  declare proxyList: BelongsTo<typeof ProxyList>

  @belongsTo(() => ProxyEntry)
  declare proxyEntry: BelongsTo<typeof ProxyEntry>
}
