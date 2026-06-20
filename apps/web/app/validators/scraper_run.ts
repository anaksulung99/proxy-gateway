import vine from '@vinejs/vine'

export const deleteRunsValidator = vine.create({
  ids: vine.array(vine.number().positive()).minLength(1),
})
