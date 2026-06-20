import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.enum('name', ['admin', 'user']).notNullable().unique()
      table.integer('level').notNullable().unique()
      table.string('description', 255).nullable()

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').nullable()

      table.index(['level'])
    })

    this.defer(async (db) => {
      await db.table(this.tableName).multiInsert([
        { name: 'admin', level: 100, description: 'Full administrative access' },
        { name: 'user', level: 10, description: 'Standard application access' },
      ])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
