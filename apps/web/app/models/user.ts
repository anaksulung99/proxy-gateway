import { UserSchema } from '#database/schema'
import Team from '#models/team'
import ApiKey from '#models/api_key'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @belongsTo(() => Team, { foreignKey: 'currentTeamId' })
  declare currentTeam: BelongsTo<typeof Team>

  @hasMany(() => Team, { foreignKey: 'ownerId' })
  declare ownedTeams: HasMany<typeof Team>

  @hasMany(() => ApiKey)
  declare apiKeys: HasMany<typeof ApiKey>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }

    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
