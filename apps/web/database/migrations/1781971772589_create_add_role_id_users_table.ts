import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('role_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('roles')
        .onDelete('RESTRICT')
      table.index(['role_id'])
    })

    this.defer(async (db) => {
      const defaultRole = await db.from('roles').where('name', 'user').select('id').first()
      if (!defaultRole) throw new Error('Default user role was not created')

      await db.from(this.tableName).whereNull('role_id').update({ role_id: defaultRole.id })
      await db.rawQuery('ALTER TABLE users ALTER COLUMN role_id SET NOT NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['role_id'])
      table.dropIndex(['role_id'])
      table.dropColumn('role_id')
    })
  }
}
