import { TeamSchema } from '#database/schema'
import User from '#models/user'
import ProxyList from '#models/proxy_list'
import ScraperSource from '#models/scraper_source'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Team extends TeamSchema {
  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>

  @hasMany(() => ProxyList)
  declare proxyLists: HasMany<typeof ProxyList>

  @hasMany(() => ScraperSource)
  declare scraperSources: HasMany<typeof ScraperSource>
}
