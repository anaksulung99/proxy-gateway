import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rotation_configs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      // 1:1 with proxy_lists
      table
        .integer('proxy_list_id')
        .unsigned()
        .references('id')
        .inTable('proxy_lists')
        .onDelete('CASCADE')
        .notNullable()
        .unique()

      // sticky | per_request | interval
      table.string('rotation_type', 16).notNullable().defaultTo('per_request')
      // for sticky: how long a session keeps the same IP
      table.integer('sticky_duration_minutes').nullable()
      // for interval: rotate every N minutes (1..30)
      table.integer('interval_minutes').nullable()

      // http | https | socks5 | any
      table.string('protocol', 16).notNullable().defaultTo('any')

      // default geo target (ISO-3166 alpha-2)
      table.string('geo_target', 2).nullable()
      // exclude lists (Postgres native arrays)
      table.specificType('exclude_countries', 'varchar(2)[]').nullable()
      table.specificType('exclude_asn', 'integer[]').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
