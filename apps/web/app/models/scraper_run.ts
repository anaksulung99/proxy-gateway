import { DateTime } from 'luxon'
import Team from '#models/team'
import ProxyList from '#models/proxy_list'
import ScraperSource from '#models/scraper_source'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ScraperRun extends BaseModel {
  static table = 'scraper_runs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare teamId: number

  @column()
  declare scraperSourceId: number | null

  @column()
  declare proxyListId: number | null

  @column()
  declare triggerType: 'manual' | 'batch' | 'scheduled'

  @column()
  declare status: 'running' | 'success' | 'error'

  @column()
  declare checkMode: 'request' | 'playwright' | 'crawlee'

  @column()
  declare sourceKey: string

  @column()
  declare sourceName: string

  @column()
  declare targetListName: string | null

  @column()
  declare scheduleCron: string | null

  @column()
  declare scrapedTotal: number

  @column()
  declare createdCount: number

  @column()
  declare updatedCount: number

  @column()
  declare invalidCount: number

  @column()
  declare duplicateCount: number

  @column()
  declare enqueuedCount: number

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

  @belongsTo(() => ScraperSource)
  declare scraperSource: BelongsTo<typeof ScraperSource>

  @belongsTo(() => ProxyList)
  declare proxyList: BelongsTo<typeof ProxyList>
}
