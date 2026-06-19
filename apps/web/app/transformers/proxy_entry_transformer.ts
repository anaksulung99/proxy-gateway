import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProxyEntry from '#models/proxy_entry'

export default class ProxyEntryTransformer extends BaseTransformer<ProxyEntry> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'proxyListId',
      'host',
      'port',
      'protocol',
      'username',
      'password',
      'countryCode',
      'asnNumber',
      'status',
      'latencyMs',
      'returnedIp',
      'createdAt',
      'updatedAt',
    ])
  }
}
