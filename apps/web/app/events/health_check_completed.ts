import { BaseEvent } from '@adonisjs/core/events'

export default class HealthCheckCompleted extends BaseEvent {
  /**
   * Accept event data as constructor parameters
   */
  constructor() {
    super()
  }
}
