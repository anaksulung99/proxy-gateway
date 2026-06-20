import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Monthly bandwidth quota (NULL = unlimited).
    this.schema.alterTable('teams', (table) => {
      table.bigInteger('monthly_quota_bytes').nullable()
    })
    this.schema.alterTable('api_keys', (table) => {
      table.bigInteger('monthly_quota_bytes').nullable()
    })

    // Attribute each gateway request to the API key that authenticated it.
    this.schema.alterTable('proxy_usage_logs', (table) => {
      table
        .integer('api_key_id')
        .unsigned()
        .references('id')
        .inTable('api_keys')
        .onDelete('SET NULL')
        .nullable()
      table.index(['api_key_id', 'requested_at'])
    })
  }

  async down() {
    this.schema.alterTable('proxy_usage_logs', (table) => {
      table.dropColumn('api_key_id')
    })
    this.schema.alterTable('teams', (table) => {
      table.dropColumn('monthly_quota_bytes')
    })
    this.schema.alterTable('api_keys', (table) => {
      table.dropColumn('monthly_quota_bytes')
    })
  }
}
