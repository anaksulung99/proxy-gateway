import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'health_check_runs'

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

      table.string('source_type', 24).notNullable()
      table.string('status', 24).notNullable().defaultTo('running')
      table.string('mode', 24).notNullable().defaultTo('request')
      table.string('target_url', 500).nullable()
      table.integer('total_inputs').notNullable().defaultTo(0)
      table.integer('checked_count').notNullable().defaultTo(0)
      table.integer('healthy_count').notNullable().defaultTo(0)
      table.integer('unhealthy_count').notNullable().defaultTo(0)
      table.integer('timeout_count').notNullable().defaultTo(0)
      table.integer('invalid_count').notNullable().defaultTo(0)
      table.text('error_message').nullable()
      table.jsonb('meta').nullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('finished_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['team_id', 'started_at'])
      table.index(['source_type', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
