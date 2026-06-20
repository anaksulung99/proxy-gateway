import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
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
      isAdmin: this.resource.role?.name === 'admin',
    }
  }
}
