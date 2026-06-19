import { DateTime } from 'luxon'
import Team from '#models/team'
import ProxyList from '#models/proxy_list'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class HealthCheckRun extends BaseModel {
  static table = 'health_check_runs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare teamId: number

  @column()
  declare proxyListId: number | null

  @column()
  declare sourceType: 'tools' | 'proxy_list_bulk'

  @column()
  declare status: 'running' | 'success' | 'error'

  @column()
  declare mode: 'request' | 'playwright' | 'crawlee'

  @column()
  declare targetUrl: string | null

  @column()
  declare totalInputs: number

  @column()
  declare checkedCount: number

  @column()
  declare healthyCount: number

  @column()
  declare unhealthyCount: number

  @column()
  declare timeoutCount: number

  @column()
  declare invalidCount: number

  @column()
  declare errorMessage: string | null

  @column()
  declare meta: Record<string, unknown> | null

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare finishedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => ProxyList)
  declare proxyList: BelongsTo<typeof ProxyList>
}
