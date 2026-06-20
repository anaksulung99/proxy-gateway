import { ApiKeySchema } from '#database/schema'
import User from '#models/user'
import Team from '#models/team'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { createHash, randomBytes } from 'node:crypto'

export default class ApiKey extends ApiKeySchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  /** SHA-256 hex of a token — what the gateway looks up. */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /**
   * Generate a fresh gateway key. The plaintext is returned ONCE (shown to the
   * user); only the hash + a display prefix are stored.
   */
  static generate(): { token: string; tokenHash: string; tokenPrefix: string } {
    const token = `rpx_${randomBytes(24).toString('hex')}`
    return {
      token,
      tokenHash: this.hashToken(token),
      tokenPrefix: token.slice(0, 12),
    }
  }

  get isRevoked(): boolean {
    return this.revokedAt !== null
  }
}
