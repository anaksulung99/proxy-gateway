import vine from '@vinejs/vine'

export const ROTATION_TYPES = ['sticky', 'per_request', 'interval'] as const
export const PROTOCOLS = ['http', 'https', 'socks5', 'any'] as const

/**
 * Cross-field rules (sticky => sticky_duration, interval => interval_minutes)
 * are enforced in the controller; here we validate shape + ranges.
 */
export const rotationConfigValidator = vine.create({
  rotationType: vine.enum(ROTATION_TYPES),
  protocol: vine.enum(PROTOCOLS),
  stickyDurationMinutes: vine.number().min(1).max(1440).nullable().optional(),
  intervalMinutes: vine.number().min(1).max(30).nullable().optional(),
  geoTarget: vine
    .string()
    .trim()
    .fixedLength(2)
    .transform((v) => v.toUpperCase())
    .nullable()
    .optional(),
  excludeCountries: vine
    .array(
      vine
        .string()
        .trim()
        .fixedLength(2)
        .transform((v) => v.toUpperCase())
    )
    .distinct()
    .optional(),
  excludeAsn: vine.array(vine.number().positive()).distinct().optional(),
})
