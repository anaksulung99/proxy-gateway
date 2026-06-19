import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProxyList from '#models/proxy_list'

export default class ProxyListTransformer extends BaseTransformer<ProxyList> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'teamId',
      'name',
      'description',
      'isActive',
      'createdAt',
      'updatedAt',
    ])
  }
}
