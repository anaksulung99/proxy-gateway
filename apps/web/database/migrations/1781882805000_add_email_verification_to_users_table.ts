import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('email_verified_at').nullable()
    })

    // Accounts created before email verification existed remain usable.
    this.defer(async (db) => {
      await db.from(this.tableName).whereNull('email_verified_at').update({
        email_verified_at: db.raw('CURRENT_TIMESTAMP'),
      })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('email_verified_at')
    })
  }
}
