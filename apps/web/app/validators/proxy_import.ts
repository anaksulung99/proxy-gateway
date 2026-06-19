import vine from '@vinejs/vine'

export const IMPORT_PROTOCOLS = ['http', 'https', 'socks5'] as const

/**
 * Import "own proxies": user pastes a raw blob (one proxy per line, multiple
 * accepted formats). `defaultProtocol` applies when a line has no scheme.
 */
export const proxyImportValidator = vine.create({
  raw: vine.string().trim().minLength(1).maxLength(2_000_000),
  defaultProtocol: vine.enum(IMPORT_PROTOCOLS).optional(),
})
