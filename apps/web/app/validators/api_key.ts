import vine from '@vinejs/vine'

export const createApiKeyValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  // Optional per-key monthly quota in MB (0 / empty = unlimited).
  monthlyQuotaMb: vine.number().min(0).max(10_000_000).nullable().optional(),
})

export const keyQuotaValidator = vine.create({
  monthlyQuotaMb: vine.number().min(0).max(10_000_000).nullable().optional(),
})

export const teamQuotaValidator = vine.create({
  // Team monthly quota in GB (0 / empty = unlimited).
  monthlyQuotaGb: vine.number().min(0).max(1_000_000).nullable().optional(),
})
