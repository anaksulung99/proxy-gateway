import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProxyUsageLog from '#models/proxy_usage_log'

export default class ProxyUsageLogTransformer extends BaseTransformer<ProxyUsageLog> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'isTunnel',
      'proxyEntryId',
      'proxyListId',
      'requestMethod',
      'requestedAt',
      'responseBytes',
      'selectedAsn',
      'selectedCountry',
      'selectedProtocol',
      'sessionKey',
      'statusCode',
      'success',
      'targetHost',
      'targetPort',
      'targetScheme',
      'teamId',
      'attemptCount',
      'countryOverride',
      'durationMs',
      'errorMessage',
      'createdAt',
      'updatedAt',
    ])
  }
}
