import vine from '@vinejs/vine'

export const bulkActionValidator = vine.create({
  listId: vine.number().positive(),
  action: vine.enum(['delete', 'recheck'] as const),
  ids: vine.array(vine.number().positive()).minLength(1),
})
