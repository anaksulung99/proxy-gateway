import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scraper_sources'

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
      // target list where scraped proxies land (nullable until configured)
      table
        .integer('proxy_list_id')
        .unsigned()
        .references('id')
        .inTable('proxy_lists')
        .onDelete('SET NULL')
        .nullable()

      table.string('name').notNullable()
      // adapter key e.g. proxyscrape, geonode, free_proxy_list
      table.string('source_key', 64).notNullable()
      table.boolean('is_enabled').notNullable().defaultTo(true)
      table.string('schedule_cron').nullable()
      table.integer('last_count').notNullable().defaultTo(0)
      table.timestamp('last_run_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['team_id', 'source_key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
