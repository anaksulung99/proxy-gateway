import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Role from '#models/role'
import Team from '#models/team'
import { inviteTeamValidator, updateUserValidator, deleteUsersValidator } from '#validators/user'
import { DateTime } from 'luxon'

export default class AdminController {
  async index({ request, inertia }: HttpContext) {
    const requestedPage = Number(request.input('page', 1))
    const requestedPerPage = Number(request.input('perPage', 10))
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const perPage = [10, 25, 50, 100].includes(requestedPerPage) ? requestedPerPage : 10

    const search = request.input('search', '')
    const roleName = request.input('role', '')

    const query = User.query()
    if (search) {
      query.where((searchQuery) => {
        searchQuery.whereILike('full_name', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }
    if (roleName) {
      query.whereHas('role', (roleQuery) => {
        roleQuery.where('name', roleName)
      })
    }

    query.preload('role').preload('currentTeam')

    const users = await query.paginate(page, perPage)

    return inertia.render(
      'teams/index' as never,
      {
        users: users.serialize(),
        search,
        roleName,
      } as never
    )
  }
  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(inviteTeamValidator)
    try {
      const role = await Role.query().where('name', payload.role).firstOrFail()
      const user = await User.create({
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        roleId: role.id,
        emailVerifiedAt: DateTime.fromJSDate(new Date()),
      })

      await Team.firstOrCreate({ ownerId: user.id, name: 'Default Team' }, {})
    } catch (error) {
      session.flash('error', 'User invite failed')
      return response.redirect().back()
    }

    session.flash('success', 'User invited to team')
    return response.redirect().back()
  }
  async update({ auth, request, params, response, session }: HttpContext) {
    const id = Number(params.id)
    const payload = await request.validateUsing(updateUserValidator(id))

    try {
      const user = await User.query().where('id', id).preload('role').firstOrFail()
      if (user.role?.name === 'admin') {
        session.flash('error', 'Admin user cannot be updated')
        return response.redirect().back()
      }
      if (user.id === auth.user?.id) {
        session.flash('error', 'You cannot update yourself')
        return response.redirect().back()
      }

      const role = await Role.query().where('name', payload.role).firstOrFail()
      await user
        .merge({
          fullName: payload.fullName,
          email: payload.email,
          roleId: role.id,
        })
        .save()
    } catch (error) {
      session.flash('error', 'User update failed')
      return response.redirect().back()
    }
    session.flash('success', 'User updated')
    return response.redirect().back()
  }
  async destroy({ auth, params, response, session }: HttpContext) {
    const id = Number(params.id)
    try {
      const user = await User.query().where('id', id).preload('role').firstOrFail()
      if (user.role?.name === 'admin') {
        session.flash('error', 'Admin user cannot be deleted')
        return response.redirect().back()
      }
      if (user.id === auth.user?.id) {
        session.flash('error', 'You cannot delete yourself')
        return response.redirect().back()
      }
      await user.delete()
    } catch (error) {
      session.flash('error', 'User delete failed')
      return response.redirect().back()
    }
    session.flash('success', 'User deleted')
    return response.redirect().back()
  }
  async deleteMany({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(deleteUsersValidator)
    try {
      const users = await User.query()
        .whereIn('id', payload.ids)
        .whereHas('role', (query) => query.whereNot('name', 'admin'))
        .delete()

      await Team.query()
        .whereIn(
          'ownerId',
          users.map((u) => u.id)
        )
        .delete()
    } catch (error) {
      session.flash('error', 'Users delete failed')
      return response.redirect().back()
    }
    session.flash('success', 'Users deleted')
    return response.redirect().back()
  }
}
