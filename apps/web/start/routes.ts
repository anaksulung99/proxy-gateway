/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.group(() => {
  router.get('', [controllers.Home, 'index']).as('home.index')
  router.get('about', [controllers.Home, 'about']).as('home.about')
  router.get('contact', [controllers.Home, 'contact']).as('home.contact')
  router.get('pricing', [controllers.Home, 'pricing']).as('home.pricing')
  router.get('terms', [controllers.Home, 'terms']).as('home.terms')
  router.get('privacy', [controllers.Home, 'privacy']).as('home.privacy')
  router.get('faqs', [controllers.Home, 'faqs']).as('home.faqs')
  router.post('contact', [controllers.Home, 'storeContact']).as('home.contact.store')
})

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])

    router.get('forgot-password', [controllers.Auth, 'forgotPassword']).as('password.forgot')
    router.post('forgot-password', [controllers.Auth, 'sendResetLink']).as('password.email')
    router.get('reset-password/:token', [controllers.Auth, 'resetPassword']).as('password.reset')
    router.post('reset-password', [controllers.Auth, 'updatePassword']).as('password.update')
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('verify-email', [controllers.Auth, 'verificationNotice']).as('email.notice')
    router.post('verify-email/resend', [controllers.Auth, 'resendVerification']).as('email.resend')
  })
  .use(middleware.auth())

router.get('verify-email/:token', [controllers.Auth, 'verifyEmail']).as('email.verify')

/*
| Authenticated app (team-scoped)
*/
router
  .group(() => {
    router.get('', [controllers.Dashboard, 'index']).as('dashboard')
    router.get('runtime/tasks', [controllers.Dashboard, 'activeTasks']).as('dashboard.tasks')
    router
      .get('runtime/quarantine', [controllers.Dashboard, 'runtimeQuarantine'])
      .as('dashboard.runtimeQuarantine')

    // Proxy lists
    router.get('proxy-lists', [controllers.ProxyLists, 'index']).as('proxy-lists.index')
    router.post('proxy-lists', [controllers.ProxyLists, 'store']).as('proxy-lists.store')
    router.get('proxy-lists/:id', [controllers.ProxyLists, 'show']).as('proxy-lists.show')
    router.patch('proxy-lists/:id', [controllers.ProxyLists, 'update']).as('proxy-lists.update')
    router
      .delete('proxy-lists/bulk', [controllers.ProxyLists, 'bulkDestroy'])
      .as('proxy-lists.bulkDestroy')
    router
      .post('proxy-lists/:id/update', [controllers.ProxyLists, 'update'])
      .as('proxy-lists.updatePost')
    router.delete('proxy-lists/:id', [controllers.ProxyLists, 'destroy']).as('proxy-lists.destroy')
    router
      .put('proxy-lists/:id/rotation', [controllers.ProxyLists, 'updateRotation'])
      .as('proxy-lists.rotation')
    router
      .post('proxy-lists/:id/rotation', [controllers.ProxyLists, 'updateRotation'])
      .as('proxy-lists.rotationPost')
    router
      .post('proxy-lists/:id/import', [controllers.ProxyLists, 'import'])
      .as('proxy-lists.import')
    router
      .get('proxy-lists/:id/export', [controllers.ProxyEntries, 'export'])
      .as('proxy-lists.export')

    // Proxy entries (bulk actions)
    router.post('proxy-entries/bulk', [controllers.ProxyEntries, 'bulk']).as('proxy-entries.bulk')
    router
      .post('proxy-entries/bulk/recheck', [controllers.ProxyEntries, 'runReBulkCheck'])
      .as('proxy-entries.runReBulkCheck')
    router
      .delete('proxy-entries/bulk/delete', [controllers.ProxyEntries, 'deleteManyByStatus'])
      .as('proxy-entries.deleteManyByStatusPost')

    // Gateway usage analytics
    router.get('analytics', [controllers.ProxyUsageAnalytics, 'index']).as('analytics.index')
    router
      .get('analytics/export', [controllers.ProxyUsageAnalytics, 'export'])
      .as('analytics.export')
    router
      .delete('analytics/bulk', [controllers.ProxyUsageAnalytics, 'deleteMany'])
      .as('analytics.deleteManyPost')

    // Tools — external health checker
    router.get('tools', [controllers.ToolsChecker, 'index']).as('tools.index')
    router.get('tools/logs', [controllers.ToolsChecker, 'logs']).as('tools.logs')
    router.post('tools/check', [controllers.ToolsChecker, 'check']).as('tools.check')
    router
      .delete('tools/check', [controllers.ToolsChecker, 'deleteMany'])
      .as('tools.deleteManyPost')

    // Scraper — proxy sources
    router.get('scraper', [controllers.ScraperSources, 'index']).as('scraper.index')
    router.get('scraper/logs', [controllers.ScraperSources, 'logs']).as('scraper.logs')
    router.patch('scraper/:id', [controllers.ScraperSources, 'update']).as('scraper.update')
    router
      .post('scraper/:id/update', [controllers.ScraperSources, 'update'])
      .as('scraper.updatePost')
    router.post('scraper/:id/run', [controllers.ScraperSources, 'run']).as('scraper.run')
    router
      .post('scraper/run-enabled', [controllers.ScraperSources, 'runEnabled'])
      .as('scraper.runEnabled')
    router
      .delete('scraper/logs/delete', [controllers.ScraperSources, 'deleteMany'])
      .as('scraper.deleteManyPost')

    // Settings — API keys (gateway credentials)
    router.get('settings/api-keys', [controllers.ApiKeys, 'index']).as('api-keys.index')
    router.post('settings/api-keys', [controllers.ApiKeys, 'store']).as('api-keys.store')
    router.delete('settings/api-keys/:id', [controllers.ApiKeys, 'revoke']).as('api-keys.revoke')
    router
      .post('settings/api-keys/:id/revoke', [controllers.ApiKeys, 'revoke'])
      .as('api-keys.revokePost')
    router
      .post('settings/api-keys/:id/quota', [controllers.ApiKeys, 'updateQuota'])
      .as('api-keys.quota')
    router
      .post('settings/team-quota', [controllers.ApiKeys, 'updateTeamQuota'])
      .as('api-keys.teamQuota')

    router
      .group(() => {
        router.get('teams', [controllers.Admin, 'index']).as('teams.index')
        router.post('teams', [controllers.Admin, 'store']).as('teams.store')
        router.patch('teams/:id', [controllers.Admin, 'update']).as('teams.update')
        router.delete('teams/:id/delete', [controllers.Admin, 'destroy']).as('teams.destroy')
        router.delete('teams/bulk', [controllers.Admin, 'deleteMany']).as('teams.deleteManyPost')
      })
      .use([middleware.admin()])

    router.group(() => {
      router.get('profile', [controllers.Teams, 'index']).as('profile.index')
      router.patch('profile/update', [controllers.Teams, 'update']).as('profile.update')
      router.patch('profile/password', [controllers.Teams, 'password']).as('profile.password')
    })
  })
  .prefix('app')
  .use([middleware.auth(), middleware.verified(), middleware.team()])
