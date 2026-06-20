import { BaseTransformer } from '@adonisjs/core/transformers'
import type ApiKey from '#models/api_key'

export default class ApiKeyTransformer extends BaseTransformer<ApiKey> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'userId',
      'teamId',
      'name',
      'tokenHash',
      'tokenPrefix',
      'lastUsedAt',
      'revokedAt',
      'createdAt',
      'updatedAt',
    ])
  }
}
