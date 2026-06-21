import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'health_results'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('resolved_at').nullable().after('checked_at')
      table
        .integer('resolved_by_run_id')
        .unsigned()
        .references('id')
        .inTable('health_check_runs')
        .onDelete('SET NULL')
        .nullable()
        .after('resolved_at')

      table.index(['proxy_entry_id', 'resolved_at', 'checked_at'], 'health_results_resolution_idx')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['proxy_entry_id', 'resolved_at', 'checked_at'], 'health_results_resolution_idx')
      table.dropColumn('resolved_by_run_id')
      table.dropColumn('resolved_at')
    })
  }
}
