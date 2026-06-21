/* eslint-disable prettier/prettier */
import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'roleId',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      role: this.resource.role
        ? {
          id: this.resource.role.id,
          name: this.resource.role.name,
          level: this.resource.role.level,
        }
        : null,
      currentTeam: this.resource.currentTeam
        ? {
          id: this.resource.currentTeam.id,
          owner_id: this.resource.currentTeam.ownerId,
          name: this.resource.currentTeam.name,
        }
        : null,
      isAdmin: this.resource.role?.name === 'admin',
    }
  }
}
