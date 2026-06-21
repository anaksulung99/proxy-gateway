/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: {
    index: typeof routes['home.index']
    about: typeof routes['home.about']
    contact: typeof routes['home.contact'] & {
      store: typeof routes['home.contact.store']
    }
    pricing: typeof routes['home.pricing']
    terms: typeof routes['home.terms']
    privacy: typeof routes['home.privacy']
    faqs: typeof routes['home.faqs']
  }
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  password: {
    forgot: typeof routes['password.forgot']
    email: typeof routes['password.email']
    reset: typeof routes['password.reset']
    update: typeof routes['password.update']
  }
  email: {
    notice: typeof routes['email.notice']
    resend: typeof routes['email.resend']
    verify: typeof routes['email.verify']
  }
  dashboard: typeof routes['dashboard'] & {
    tasks: typeof routes['dashboard.tasks']
    runtimeQuarantine: typeof routes['dashboard.runtimeQuarantine']
  }
  docs: {
    externalProxyTesting: typeof routes['docs.externalProxyTesting']
  }
  proxyLists: {
    index: typeof routes['proxy-lists.index']
    store: typeof routes['proxy-lists.store']
    show: typeof routes['proxy-lists.show']
    update: typeof routes['proxy-lists.update']
    bulkDestroy: typeof routes['proxy-lists.bulkDestroy']
    updatePost: typeof routes['proxy-lists.updatePost']
    destroy: typeof routes['proxy-lists.destroy']
    rotation: typeof routes['proxy-lists.rotation']
    rotationPost: typeof routes['proxy-lists.rotationPost']
    import: typeof routes['proxy-lists.import']
    export: typeof routes['proxy-lists.export']
  }
  proxyEntries: {
    bulk: typeof routes['proxy-entries.bulk']
    runReBulkCheck: typeof routes['proxy-entries.runReBulkCheck']
    deleteManyByStatusPost: typeof routes['proxy-entries.deleteManyByStatusPost']
  }
  analytics: {
    index: typeof routes['analytics.index']
    export: typeof routes['analytics.export']
    deleteManyPost: typeof routes['analytics.deleteManyPost']
  }
  tools: {
    index: typeof routes['tools.index']
    logs: typeof routes['tools.logs']
    check: typeof routes['tools.check']
    deleteManyPost: typeof routes['tools.deleteManyPost']
  }
  scraper: {
    index: typeof routes['scraper.index']
    logs: typeof routes['scraper.logs']
    update: typeof routes['scraper.update']
    updatePost: typeof routes['scraper.updatePost']
    run: typeof routes['scraper.run']
    runEnabled: typeof routes['scraper.runEnabled']
    deleteManyPost: typeof routes['scraper.deleteManyPost']
  }
  apiKeys: {
    index: typeof routes['api-keys.index']
    store: typeof routes['api-keys.store']
    revoke: typeof routes['api-keys.revoke']
    revokePost: typeof routes['api-keys.revokePost']
    quota: typeof routes['api-keys.quota']
    teamQuota: typeof routes['api-keys.teamQuota']
  }
  teams: {
    index: typeof routes['teams.index']
    store: typeof routes['teams.store']
    update: typeof routes['teams.update']
    destroy: typeof routes['teams.destroy']
    deleteManyPost: typeof routes['teams.deleteManyPost']
  }
  profile: {
    index: typeof routes['profile.index']
    update: typeof routes['profile.update']
    password: typeof routes['profile.password']
  }
}
