import vine from '@vinejs/vine'

export const createProxyListValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  isActive: vine.boolean().optional(),
})

export const updateProxyListValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120).optional(),
  description: vine.string().trim().maxLength(500).nullable().optional(),
  isActive: vine.boolean().optional(),
})
