import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home.index': { paramsTuple?: []; params?: {} }
    'home.about': { paramsTuple?: []; params?: {} }
    'home.contact': { paramsTuple?: []; params?: {} }
    'home.pricing': { paramsTuple?: []; params?: {} }
    'home.terms': { paramsTuple?: []; params?: {} }
    'home.privacy': { paramsTuple?: []; params?: {} }
    'home.faqs': { paramsTuple?: []; params?: {} }
    'home.contact.store': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.email': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'email.notice': { paramsTuple?: []; params?: {} }
    'email.resend': { paramsTuple?: []; params?: {} }
    'email.verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'dashboard.tasks': { paramsTuple?: []; params?: {} }
    'dashboard.runtimeQuarantine': { paramsTuple?: []; params?: {} }
    'proxy-lists.index': { paramsTuple?: []; params?: {} }
    'proxy-lists.store': { paramsTuple?: []; params?: {} }
    'proxy-lists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.bulkDestroy': { paramsTuple?: []; params?: {} }
    'proxy-lists.updatePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.rotation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.rotationPost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.import': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-entries.bulk': { paramsTuple?: []; params?: {} }
    'proxy-entries.runReBulkCheck': { paramsTuple?: []; params?: {} }
    'proxy-entries.deleteManyByStatusPost': { paramsTuple?: []; params?: {} }
    'analytics.index': { paramsTuple?: []; params?: {} }
    'analytics.export': { paramsTuple?: []; params?: {} }
    'analytics.deleteManyPost': { paramsTuple?: []; params?: {} }
    'tools.index': { paramsTuple?: []; params?: {} }
    'tools.logs': { paramsTuple?: []; params?: {} }
    'tools.check': { paramsTuple?: []; params?: {} }
    'tools.deleteManyPost': { paramsTuple?: []; params?: {} }
    'scraper.index': { paramsTuple?: []; params?: {} }
    'scraper.logs': { paramsTuple?: []; params?: {} }
    'scraper.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.updatePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.run': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.runEnabled': { paramsTuple?: []; params?: {} }
    'scraper.deleteManyPost': { paramsTuple?: []; params?: {} }
    'api-keys.index': { paramsTuple?: []; params?: {} }
    'api-keys.store': { paramsTuple?: []; params?: {} }
    'api-keys.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api-keys.revokePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api-keys.quota': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api-keys.teamQuota': { paramsTuple?: []; params?: {} }
    'teams.index': { paramsTuple?: []; params?: {} }
    'teams.store': { paramsTuple?: []; params?: {} }
    'teams.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.deleteManyPost': { paramsTuple?: []; params?: {} }
    'profile.index': { paramsTuple?: []; params?: {} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home.index': { paramsTuple?: []; params?: {} }
    'home.about': { paramsTuple?: []; params?: {} }
    'home.contact': { paramsTuple?: []; params?: {} }
    'home.pricing': { paramsTuple?: []; params?: {} }
    'home.terms': { paramsTuple?: []; params?: {} }
    'home.privacy': { paramsTuple?: []; params?: {} }
    'home.faqs': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email.notice': { paramsTuple?: []; params?: {} }
    'email.verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'dashboard.tasks': { paramsTuple?: []; params?: {} }
    'dashboard.runtimeQuarantine': { paramsTuple?: []; params?: {} }
    'proxy-lists.index': { paramsTuple?: []; params?: {} }
    'proxy-lists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'analytics.index': { paramsTuple?: []; params?: {} }
    'analytics.export': { paramsTuple?: []; params?: {} }
    'tools.index': { paramsTuple?: []; params?: {} }
    'tools.logs': { paramsTuple?: []; params?: {} }
    'scraper.index': { paramsTuple?: []; params?: {} }
    'scraper.logs': { paramsTuple?: []; params?: {} }
    'api-keys.index': { paramsTuple?: []; params?: {} }
    'teams.index': { paramsTuple?: []; params?: {} }
    'profile.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home.index': { paramsTuple?: []; params?: {} }
    'home.about': { paramsTuple?: []; params?: {} }
    'home.contact': { paramsTuple?: []; params?: {} }
    'home.pricing': { paramsTuple?: []; params?: {} }
    'home.terms': { paramsTuple?: []; params?: {} }
    'home.privacy': { paramsTuple?: []; params?: {} }
    'home.faqs': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email.notice': { paramsTuple?: []; params?: {} }
    'email.verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'dashboard.tasks': { paramsTuple?: []; params?: {} }
    'dashboard.runtimeQuarantine': { paramsTuple?: []; params?: {} }
    'proxy-lists.index': { paramsTuple?: []; params?: {} }
    'proxy-lists.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.export': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'analytics.index': { paramsTuple?: []; params?: {} }
    'analytics.export': { paramsTuple?: []; params?: {} }
    'tools.index': { paramsTuple?: []; params?: {} }
    'tools.logs': { paramsTuple?: []; params?: {} }
    'scraper.index': { paramsTuple?: []; params?: {} }
    'scraper.logs': { paramsTuple?: []; params?: {} }
    'api-keys.index': { paramsTuple?: []; params?: {} }
    'teams.index': { paramsTuple?: []; params?: {} }
    'profile.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'home.contact.store': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password.email': { paramsTuple?: []; params?: {} }
    'password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'email.resend': { paramsTuple?: []; params?: {} }
    'proxy-lists.store': { paramsTuple?: []; params?: {} }
    'proxy-lists.updatePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.rotationPost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-lists.import': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-entries.bulk': { paramsTuple?: []; params?: {} }
    'proxy-entries.runReBulkCheck': { paramsTuple?: []; params?: {} }
    'tools.check': { paramsTuple?: []; params?: {} }
    'scraper.updatePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.run': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.runEnabled': { paramsTuple?: []; params?: {} }
    'api-keys.store': { paramsTuple?: []; params?: {} }
    'api-keys.revokePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api-keys.quota': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'api-keys.teamQuota': { paramsTuple?: []; params?: {} }
    'teams.store': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'proxy-lists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.password': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'proxy-lists.bulkDestroy': { paramsTuple?: []; params?: {} }
    'proxy-lists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'proxy-entries.deleteManyByStatusPost': { paramsTuple?: []; params?: {} }
    'analytics.deleteManyPost': { paramsTuple?: []; params?: {} }
    'tools.deleteManyPost': { paramsTuple?: []; params?: {} }
    'scraper.deleteManyPost': { paramsTuple?: []; params?: {} }
    'api-keys.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.deleteManyPost': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'proxy-lists.rotation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}