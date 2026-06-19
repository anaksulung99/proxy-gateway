import { ScraperSourceSchema } from '#database/schema'
import Team from '#models/team'
import ProxyList from '#models/proxy_list'
import ScraperRun from '#models/scraper_run'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class ScraperSource extends ScraperSourceSchema {
  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => ProxyList)
  declare proxyList: BelongsTo<typeof ProxyList>

  @hasMany(() => ScraperRun)
  declare runs: HasMany<typeof ScraperRun>
}
