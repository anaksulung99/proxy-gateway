import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Team from '#models/team'
import ProxyList from '#models/proxy_list'
import ProxyEntry from '#models/proxy_entry'
import RotationConfig from '#models/rotation_config'
import HealthResult from '#models/health_result'
import { DateTime } from 'luxon'
import Role from '#models/role'
import Env from '#start/env'

export default class extends BaseSeeder {
  async run() {
    const adminRole = await Role.firstOrCreate(
      { name: 'admin' },
      { level: 100, description: 'Full administrative access' }
    )

    // 1. User (idempotent by email)
    const user = await User.firstOrCreate(
      { email: Env.get('DEFAULT_ADMIN_EMAIL') },
      { fullName: 'Admin Dev', password: Env.get('DEFAULT_ADMIN_PASSWORD'), roleId: adminRole.id }
    )

    if (user.roleId !== adminRole.id) {
      user.roleId = adminRole.id
      await user.save()
    }

    // 2. Team owned by the user
    const team = await Team.firstOrCreate({ ownerId: user.id, name: 'Default Team' }, {})

    // Set as the user's current team
    if (user.currentTeamId !== team.id) {
      user.currentTeamId = team.id
      await user.save()
    }

    // 3. Proxy list in the team
    const list = await ProxyList.firstOrCreate(
      { teamId: team.id, name: 'Sample Residential Pool' },
      { description: 'Seeded sample list', isActive: true }
    )

    // 4. Rotation config (1:1) with array columns exercised
    await RotationConfig.updateOrCreate(
      { proxyListId: list.id },
      {
        rotationType: 'interval',
        intervalMinutes: 10,
        stickyDurationMinutes: null,
        protocol: 'http',
        geoTarget: 'US',
        excludeCountries: ['CN', 'RU'],
        excludeAsn: [13335, 15169],
      }
    )

    // 5. Proxy entries
    const entry = await ProxyEntry.updateOrCreate(
      { proxyListId: list.id, host: '203.0.113.10', port: 8080 },
      {
        protocol: 'http',
        username: 'user1',
        password: 'pass1',
        countryCode: 'US',
        asnNumber: 7922,
        status: 'healthy',
        latencyMs: 320,
        returnedIp: '203.0.113.10',
        source: 'import',
        lastCheckedAt: DateTime.now(),
      }
    )
    await ProxyEntry.updateOrCreate(
      { proxyListId: list.id, host: '198.51.100.22', port: 1080 },
      {
        protocol: 'socks5',
        countryCode: 'DE',
        asnNumber: 3320,
        status: 'unknown',
        source: 'scrape',
      }
    )

    // 6. Health result history for the first entry
    await HealthResult.create({
      proxyEntryId: entry.id,
      mode: 'request',
      healthy: true,
      latencyMs: 320,
      returnedIp: '203.0.113.10',
      statusCode: 200,
      checkedAt: DateTime.now(),
    })

    // ---- Read back with preloads to verify relationships ----
    const verify = await ProxyList.query()
      .where('id', list.id)
      .preload('team', (q) => q.preload('owner'))
      .preload('rotationConfig')
      .preload('entries', (q) => q.preload('healthResults'))
      .firstOrFail()

    const rc = verify.rotationConfig
    console.log(
      `[verify] list="${verify.name}" team="${verify.team.name}" owner="${verify.team.owner.email}" ` +
        `entries=${verify.entries.length} rotation=${rc.rotationType}/${rc.intervalMinutes}m ` +
        `excludeCountries=${JSON.stringify(rc.excludeCountries)} excludeAsn=${JSON.stringify(rc.excludeAsn)} ` +
        `firstEntryHealthChecks=${verify.entries[0]?.healthResults.length ?? 0}`
    )
  }
}
