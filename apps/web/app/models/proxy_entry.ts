import { ProxyEntrySchema } from '#database/schema'
import ProxyList from '#models/proxy_list'
import HealthResult from '#models/health_result'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class ProxyEntry extends ProxyEntrySchema {
  @belongsTo(() => ProxyList)
  declare proxyList: BelongsTo<typeof ProxyList>

  @hasMany(() => HealthResult)
  declare healthResults: HasMany<typeof HealthResult>
}
