import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scraper_runs'

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
        .integer('scraper_source_id')
        .unsigned()
        .references('id')
        .inTable('scraper_sources')
        .onDelete('SET NULL')
        .nullable()
      table
        .integer('proxy_list_id')
        .unsigned()
        .references('id')
        .inTable('proxy_lists')
        .onDelete('SET NULL')
        .nullable()

      table.string('trigger_type', 24).notNullable()
      table.string('status', 24).notNullable().defaultTo('running')
      table.string('check_mode', 24).notNullable().defaultTo('request')
      table.string('source_key', 64).notNullable()
      table.string('source_name', 120).notNullable()
      table.string('target_list_name', 150).nullable()
      table.string('schedule_cron', 120).nullable()
      table.integer('scraped_total').notNullable().defaultTo(0)
      table.integer('created_count').notNullable().defaultTo(0)
      table.integer('updated_count').notNullable().defaultTo(0)
      table.integer('invalid_count').notNullable().defaultTo(0)
      table.integer('duplicate_count').notNullable().defaultTo(0)
      table.integer('enqueued_count').notNullable().defaultTo(0)
      table.text('error_message').nullable()
      table.jsonb('meta').nullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('finished_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['team_id', 'started_at'])
      table.index(['scraper_source_id', 'started_at'])
      table.index(['status', 'trigger_type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
