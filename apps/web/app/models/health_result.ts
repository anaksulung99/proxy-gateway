import { HealthResultSchema } from '#database/schema'
import ProxyEntry from '#models/proxy_entry'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class HealthResult extends HealthResultSchema {
  @belongsTo(() => ProxyEntry)
  declare proxyEntry: BelongsTo<typeof ProxyEntry>
}
