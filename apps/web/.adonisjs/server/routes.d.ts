import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
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
    'analytics.index': { paramsTuple?: []; params?: {} }
    'analytics.export': { paramsTuple?: []; params?: {} }
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
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email.notice': { paramsTuple?: []; params?: {} }
    'email.verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
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
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password.forgot': { paramsTuple?: []; params?: {} }
    'password.reset': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'email.notice': { paramsTuple?: []; params?: {} }
    'email.verify': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
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
  }
  POST: {
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
    'tools.check': { paramsTuple?: []; params?: {} }
    'scraper.updatePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.run': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.runEnabled': { paramsTuple?: []; params?: {} }
    'api-keys.store': { paramsTuple?: []; params?: {} }
    'api-keys.revokePost': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'proxy-lists.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'scraper.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'proxy-lists.bulkDestroy': { paramsTuple?: []; params?: {} }
    'proxy-lists.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tools.deleteManyPost': { paramsTuple?: []; params?: {} }
    'scraper.deleteManyPost': { paramsTuple?: []; params?: {} }
    'api-keys.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'proxy-lists.rotation': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}