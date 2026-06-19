import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'proxy_usage_logs'

  async up() {
    // Pre-auth / list-resolution-failure events have no team yet, so the
    // gateway must be able to log them with a NULL team_id.
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('team_id').unsigned().nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('team_id').unsigned().notNullable().alter()
    })
  }
}
