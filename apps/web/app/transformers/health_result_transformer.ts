import { BaseTransformer } from '@adonisjs/core/transformers'
import type HealthResult from '#models/health_result'

export default class HealthResultTransformer extends BaseTransformer<HealthResult> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'proxyEntryId',
      'mode',
      'healthy',
      'latencyMs',
      'returnedIp',
      'statusCode',
      'errorMessage',
      'createdAt',
      'updatedAt',
    ])
  }
}
