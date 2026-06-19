import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'health_results'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('proxy_entry_id')
        .unsigned()
        .references('id')
        .inTable('proxy_entries')
        .onDelete('CASCADE')
        .notNullable()

      // request | playwright | crawlee
      table.string('mode', 16).notNullable()
      table.boolean('healthy').notNullable()
      table.integer('latency_ms').nullable()
      table.string('returned_ip', 45).nullable()
      table.integer('status_code').nullable()
      table.text('error_message').nullable()
      table.timestamp('checked_at').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['proxy_entry_id', 'checked_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
