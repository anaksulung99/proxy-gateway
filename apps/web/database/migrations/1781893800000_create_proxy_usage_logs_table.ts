import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'proxy_usage_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('team_id')
        .unsigned()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
        .notNullable()
      table
        .integer('proxy_list_id')
        .unsigned()
        .references('id')
        .inTable('proxy_lists')
        .onDelete('SET NULL')
        .nullable()
      table
        .integer('proxy_entry_id')
        .unsigned()
        .references('id')
        .inTable('proxy_entries')
        .onDelete('SET NULL')
        .nullable()

      table.string('request_method', 16).notNullable()
      table.string('target_host', 255).nullable()
      table.integer('target_port').nullable()
      table.string('target_scheme', 16).nullable()
      table.boolean('is_tunnel').notNullable().defaultTo(false)
      table.boolean('success').notNullable().defaultTo(false)
      table.integer('status_code').nullable()
      table.integer('attempt_count').notNullable().defaultTo(1)
      table.integer('duration_ms').notNullable().defaultTo(0)
      table.bigInteger('response_bytes').notNullable().defaultTo(0)

      table.string('session_key', 120).nullable()
      table.string('country_override', 8).nullable()
      table.string('selected_protocol', 16).nullable()
      table.string('selected_country', 8).nullable()
      table.integer('selected_asn').nullable()
      table.text('error_message').nullable()
      table.timestamp('requested_at').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['team_id', 'requested_at'])
      table.index(['proxy_list_id', 'requested_at'])
      table.index(['success', 'requested_at'])
      table.index(['target_host', 'requested_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
