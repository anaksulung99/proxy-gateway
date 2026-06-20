import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_keys'

  async up() {
    // Restructure api_keys into team-scoped, hashed, revocable gateway keys.
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('token') // never store the plaintext proxy password
    })
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('team_id')
        .unsigned()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
        .notNullable()
      table.string('token_hash', 64).notNullable().unique()
      table.string('token_prefix', 24).notNullable()
      table.timestamp('revoked_at').nullable()

      table.index(['team_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('team_id')
      table.dropColumn('token_hash')
      table.dropColumn('token_prefix')
      table.dropColumn('revoked_at')
    })
    this.schema.alterTable(this.tableName, (table) => {
      table.string('token', 128).notNullable().defaultTo('').unique()
    })
  }
}
