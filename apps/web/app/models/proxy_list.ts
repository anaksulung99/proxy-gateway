import { ProxyListSchema } from '#database/schema'
import Team from '#models/team'
import ProxyEntry from '#models/proxy_entry'
import RotationConfig from '#models/rotation_config'
import ScraperSource from '#models/scraper_source'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export default class ProxyList extends ProxyListSchema {
  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @hasMany(() => ProxyEntry)
  declare entries: HasMany<typeof ProxyEntry>

  @hasOne(() => RotationConfig)
  declare rotationConfig: HasOne<typeof RotationConfig>

  @hasMany(() => ScraperSource)
  declare scraperSources: HasMany<typeof ScraperSource>
}
