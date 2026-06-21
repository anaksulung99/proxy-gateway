import vine from '@vinejs/vine'

export const contactValidator = vine.create({
  name: vine.string().minLength(2).maxLength(255),
  email: vine.string().email().maxLength(255),
  message: vine.string().minLength(2).maxLength(255),
})
