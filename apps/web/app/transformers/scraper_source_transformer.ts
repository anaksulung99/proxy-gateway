import { BaseTransformer } from '@adonisjs/core/transformers'
import type ScraperSource from '#models/scraper_source'

export default class ScraperSourceTransformer extends BaseTransformer<ScraperSource> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'teamId',
      'name',
      'proxyListId',
      'sourceKey',
      'isEnabled',
      'scheduleCron',
      'lastCount',
      'lastRunAt',
      'createdAt',
      'updatedAt',
    ])
  }
}
