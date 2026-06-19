import { BaseTransformer } from '@adonisjs/core/transformers'
import type RotationConfig from '#models/rotation_config'

export default class RotationConfigTransformer extends BaseTransformer<RotationConfig> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'proxyListId',
      'rotationType',
      'stickyDurationMinutes',
      'intervalMinutes',
      'protocol',
      'geoTarget',
      'excludeCountries',
      'excludeAsn',
      'createdAt',
      'updatedAt',
    ])
  }
}
