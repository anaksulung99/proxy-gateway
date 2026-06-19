import { RotationConfigSchema } from '#database/schema'
import ProxyList from '#models/proxy_list'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class RotationConfig extends RotationConfigSchema {
  @belongsTo(() => ProxyList)
  declare proxyList: BelongsTo<typeof ProxyList>
}
