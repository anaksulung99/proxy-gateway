import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password().confirmed({
    confirmationField: 'passwordConfirmation',
  }),
})

export const emailValidator = vine.create({ email: email() })

export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

export const resetPasswordValidator = vine.create({
  token: vine.string(),
  password: password().confirmed({ confirmationField: 'passwordConfirmation' }),
})
