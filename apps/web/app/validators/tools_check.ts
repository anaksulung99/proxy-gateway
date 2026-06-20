import vine from '@vinejs/vine'

export const toolsCheckValidator = vine.create({
  raw: vine.string().trim().minLength(1).maxLength(200_000),
  mode: vine.enum(['request', 'playwright', 'crawlee'] as const),
  targetUrl: vine.string().trim().url().optional(),
})

export const deleteToolsCheckValidator = vine.create({
  ids: vine.array(vine.number().positive()).minLength(1),
})
