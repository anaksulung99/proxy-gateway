import vine from '@vinejs/vine'

export const bulkActionValidator = vine.create({
  listId: vine.number().positive(),
  action: vine.enum(['delete', 'recheck'] as const),
  ids: vine.array(vine.number().positive()).minLength(1),
  trigger: vine.enum(['manual_recheck', 'runtime_quarantine_recheck'] as const).optional(),
})
export const recheckBulkValidator = vine.create({
  listId: vine.number().positive(),
  status: vine.enum(['timeout', 'unhealthy', 'unknown'] as const),
})
export const deleteManyByStatusValidator = vine.create({
  status: vine.enum(['timeout', 'unhealthy', 'unknown'] as const),
})
