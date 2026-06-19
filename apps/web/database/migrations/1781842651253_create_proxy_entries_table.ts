import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'proxy_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('proxy_list_id')
        .unsigned()
        .references('id')
        .inTable('proxy_lists')
        .onDelete('CASCADE')
        .notNullable()

      table.string('host').notNullable()
      table.integer('port').notNullable()
      // http | https | socks5
      table.string('protocol', 16).notNullable().defaultTo('http')
      table.string('username').nullable()
      table.string('password').nullable()

      // Geo / network metadata (filled by health checker)
      table.string('country_code', 2).nullable()
      table.integer('asn_number').nullable()

      // unknown | healthy | unhealthy | timeout
      table.string('status', 16).notNullable().defaultTo('unknown')
      table.integer('latency_ms').nullable()
      table.string('returned_ip', 45).nullable()
      table.timestamp('last_checked_at').nullable()

      // import | scrape
      table.string('source', 16).notNullable().defaultTo('import')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['proxy_list_id', 'host', 'port'])
      table.index(['proxy_list_id', 'status'])
      table.index(['country_code'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
