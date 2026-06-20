/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'password.forgot': {
    methods: ["GET","HEAD"],
    pattern: '/forgot-password',
    tokens: [{"old":"/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['password.forgot']['types'],
  },
  'password.email': {
    methods: ["POST"],
    pattern: '/forgot-password',
    tokens: [{"old":"/forgot-password","type":0,"val":"forgot-password","end":""}],
    types: placeholder as Registry['password.email']['types'],
  },
  'password.reset': {
    methods: ["GET","HEAD"],
    pattern: '/reset-password/:token',
    tokens: [{"old":"/reset-password/:token","type":0,"val":"reset-password","end":""},{"old":"/reset-password/:token","type":1,"val":"token","end":""}],
    types: placeholder as Registry['password.reset']['types'],
  },
  'password.update': {
    methods: ["POST"],
    pattern: '/reset-password',
    tokens: [{"old":"/reset-password","type":0,"val":"reset-password","end":""}],
    types: placeholder as Registry['password.update']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'email.notice': {
    methods: ["GET","HEAD"],
    pattern: '/verify-email',
    tokens: [{"old":"/verify-email","type":0,"val":"verify-email","end":""}],
    types: placeholder as Registry['email.notice']['types'],
  },
  'email.resend': {
    methods: ["POST"],
    pattern: '/verify-email/resend',
    tokens: [{"old":"/verify-email/resend","type":0,"val":"verify-email","end":""},{"old":"/verify-email/resend","type":0,"val":"resend","end":""}],
    types: placeholder as Registry['email.resend']['types'],
  },
  'email.verify': {
    methods: ["GET","HEAD"],
    pattern: '/verify-email/:token',
    tokens: [{"old":"/verify-email/:token","type":0,"val":"verify-email","end":""},{"old":"/verify-email/:token","type":1,"val":"token","end":""}],
    types: placeholder as Registry['email.verify']['types'],
  },
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/app',
    tokens: [{"old":"/app","type":0,"val":"app","end":""}],
    types: placeholder as Registry['dashboard']['types'],
  },
  'proxy-lists.index': {
    methods: ["GET","HEAD"],
    pattern: '/app/proxy-lists',
    tokens: [{"old":"/app/proxy-lists","type":0,"val":"app","end":""},{"old":"/app/proxy-lists","type":0,"val":"proxy-lists","end":""}],
    types: placeholder as Registry['proxy-lists.index']['types'],
  },
  'proxy-lists.store': {
    methods: ["POST"],
    pattern: '/app/proxy-lists',
    tokens: [{"old":"/app/proxy-lists","type":0,"val":"app","end":""},{"old":"/app/proxy-lists","type":0,"val":"proxy-lists","end":""}],
    types: placeholder as Registry['proxy-lists.store']['types'],
  },
  'proxy-lists.show': {
    methods: ["GET","HEAD"],
    pattern: '/app/proxy-lists/:id',
    tokens: [{"old":"/app/proxy-lists/:id","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['proxy-lists.show']['types'],
  },
  'proxy-lists.update': {
    methods: ["PATCH"],
    pattern: '/app/proxy-lists/:id',
    tokens: [{"old":"/app/proxy-lists/:id","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['proxy-lists.update']['types'],
  },
  'proxy-lists.bulkDestroy': {
    methods: ["DELETE"],
    pattern: '/app/proxy-lists/bulk',
    tokens: [{"old":"/app/proxy-lists/bulk","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/bulk","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/bulk","type":0,"val":"bulk","end":""}],
    types: placeholder as Registry['proxy-lists.bulkDestroy']['types'],
  },
  'proxy-lists.updatePost': {
    methods: ["POST"],
    pattern: '/app/proxy-lists/:id/update',
    tokens: [{"old":"/app/proxy-lists/:id/update","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id/update","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id/update","type":1,"val":"id","end":""},{"old":"/app/proxy-lists/:id/update","type":0,"val":"update","end":""}],
    types: placeholder as Registry['proxy-lists.updatePost']['types'],
  },
  'proxy-lists.destroy': {
    methods: ["DELETE"],
    pattern: '/app/proxy-lists/:id',
    tokens: [{"old":"/app/proxy-lists/:id","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['proxy-lists.destroy']['types'],
  },
  'proxy-lists.rotation': {
    methods: ["PUT"],
    pattern: '/app/proxy-lists/:id/rotation',
    tokens: [{"old":"/app/proxy-lists/:id/rotation","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id/rotation","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id/rotation","type":1,"val":"id","end":""},{"old":"/app/proxy-lists/:id/rotation","type":0,"val":"rotation","end":""}],
    types: placeholder as Registry['proxy-lists.rotation']['types'],
  },
  'proxy-lists.rotationPost': {
    methods: ["POST"],
    pattern: '/app/proxy-lists/:id/rotation',
    tokens: [{"old":"/app/proxy-lists/:id/rotation","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id/rotation","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id/rotation","type":1,"val":"id","end":""},{"old":"/app/proxy-lists/:id/rotation","type":0,"val":"rotation","end":""}],
    types: placeholder as Registry['proxy-lists.rotationPost']['types'],
  },
  'proxy-lists.import': {
    methods: ["POST"],
    pattern: '/app/proxy-lists/:id/import',
    tokens: [{"old":"/app/proxy-lists/:id/import","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id/import","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id/import","type":1,"val":"id","end":""},{"old":"/app/proxy-lists/:id/import","type":0,"val":"import","end":""}],
    types: placeholder as Registry['proxy-lists.import']['types'],
  },
  'proxy-lists.export': {
    methods: ["GET","HEAD"],
    pattern: '/app/proxy-lists/:id/export',
    tokens: [{"old":"/app/proxy-lists/:id/export","type":0,"val":"app","end":""},{"old":"/app/proxy-lists/:id/export","type":0,"val":"proxy-lists","end":""},{"old":"/app/proxy-lists/:id/export","type":1,"val":"id","end":""},{"old":"/app/proxy-lists/:id/export","type":0,"val":"export","end":""}],
    types: placeholder as Registry['proxy-lists.export']['types'],
  },
  'proxy-entries.bulk': {
    methods: ["POST"],
    pattern: '/app/proxy-entries/bulk',
    tokens: [{"old":"/app/proxy-entries/bulk","type":0,"val":"app","end":""},{"old":"/app/proxy-entries/bulk","type":0,"val":"proxy-entries","end":""},{"old":"/app/proxy-entries/bulk","type":0,"val":"bulk","end":""}],
    types: placeholder as Registry['proxy-entries.bulk']['types'],
  },
  'analytics.index': {
    methods: ["GET","HEAD"],
    pattern: '/app/analytics',
    tokens: [{"old":"/app/analytics","type":0,"val":"app","end":""},{"old":"/app/analytics","type":0,"val":"analytics","end":""}],
    types: placeholder as Registry['analytics.index']['types'],
  },
  'analytics.export': {
    methods: ["GET","HEAD"],
    pattern: '/app/analytics/export',
    tokens: [{"old":"/app/analytics/export","type":0,"val":"app","end":""},{"old":"/app/analytics/export","type":0,"val":"analytics","end":""},{"old":"/app/analytics/export","type":0,"val":"export","end":""}],
    types: placeholder as Registry['analytics.export']['types'],
  },
  'tools.index': {
    methods: ["GET","HEAD"],
    pattern: '/app/tools',
    tokens: [{"old":"/app/tools","type":0,"val":"app","end":""},{"old":"/app/tools","type":0,"val":"tools","end":""}],
    types: placeholder as Registry['tools.index']['types'],
  },
  'tools.logs': {
    methods: ["GET","HEAD"],
    pattern: '/app/tools/logs',
    tokens: [{"old":"/app/tools/logs","type":0,"val":"app","end":""},{"old":"/app/tools/logs","type":0,"val":"tools","end":""},{"old":"/app/tools/logs","type":0,"val":"logs","end":""}],
    types: placeholder as Registry['tools.logs']['types'],
  },
  'tools.check': {
    methods: ["POST"],
    pattern: '/app/tools/check',
    tokens: [{"old":"/app/tools/check","type":0,"val":"app","end":""},{"old":"/app/tools/check","type":0,"val":"tools","end":""},{"old":"/app/tools/check","type":0,"val":"check","end":""}],
    types: placeholder as Registry['tools.check']['types'],
  },
  'tools.deleteManyPost': {
    methods: ["DELETE"],
    pattern: '/app/tools/check',
    tokens: [{"old":"/app/tools/check","type":0,"val":"app","end":""},{"old":"/app/tools/check","type":0,"val":"tools","end":""},{"old":"/app/tools/check","type":0,"val":"check","end":""}],
    types: placeholder as Registry['tools.deleteManyPost']['types'],
  },
  'scraper.index': {
    methods: ["GET","HEAD"],
    pattern: '/app/scraper',
    tokens: [{"old":"/app/scraper","type":0,"val":"app","end":""},{"old":"/app/scraper","type":0,"val":"scraper","end":""}],
    types: placeholder as Registry['scraper.index']['types'],
  },
  'scraper.logs': {
    methods: ["GET","HEAD"],
    pattern: '/app/scraper/logs',
    tokens: [{"old":"/app/scraper/logs","type":0,"val":"app","end":""},{"old":"/app/scraper/logs","type":0,"val":"scraper","end":""},{"old":"/app/scraper/logs","type":0,"val":"logs","end":""}],
    types: placeholder as Registry['scraper.logs']['types'],
  },
  'scraper.update': {
    methods: ["PATCH"],
    pattern: '/app/scraper/:id',
    tokens: [{"old":"/app/scraper/:id","type":0,"val":"app","end":""},{"old":"/app/scraper/:id","type":0,"val":"scraper","end":""},{"old":"/app/scraper/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['scraper.update']['types'],
  },
  'scraper.updatePost': {
    methods: ["POST"],
    pattern: '/app/scraper/:id/update',
    tokens: [{"old":"/app/scraper/:id/update","type":0,"val":"app","end":""},{"old":"/app/scraper/:id/update","type":0,"val":"scraper","end":""},{"old":"/app/scraper/:id/update","type":1,"val":"id","end":""},{"old":"/app/scraper/:id/update","type":0,"val":"update","end":""}],
    types: placeholder as Registry['scraper.updatePost']['types'],
  },
  'scraper.run': {
    methods: ["POST"],
    pattern: '/app/scraper/:id/run',
    tokens: [{"old":"/app/scraper/:id/run","type":0,"val":"app","end":""},{"old":"/app/scraper/:id/run","type":0,"val":"scraper","end":""},{"old":"/app/scraper/:id/run","type":1,"val":"id","end":""},{"old":"/app/scraper/:id/run","type":0,"val":"run","end":""}],
    types: placeholder as Registry['scraper.run']['types'],
  },
  'scraper.runEnabled': {
    methods: ["POST"],
    pattern: '/app/scraper/run-enabled',
    tokens: [{"old":"/app/scraper/run-enabled","type":0,"val":"app","end":""},{"old":"/app/scraper/run-enabled","type":0,"val":"scraper","end":""},{"old":"/app/scraper/run-enabled","type":0,"val":"run-enabled","end":""}],
    types: placeholder as Registry['scraper.runEnabled']['types'],
  },
  'scraper.deleteManyPost': {
    methods: ["DELETE"],
    pattern: '/app/scraper/logs/delete',
    tokens: [{"old":"/app/scraper/logs/delete","type":0,"val":"app","end":""},{"old":"/app/scraper/logs/delete","type":0,"val":"scraper","end":""},{"old":"/app/scraper/logs/delete","type":0,"val":"logs","end":""},{"old":"/app/scraper/logs/delete","type":0,"val":"delete","end":""}],
    types: placeholder as Registry['scraper.deleteManyPost']['types'],
  },
  'api-keys.index': {
    methods: ["GET","HEAD"],
    pattern: '/app/settings/api-keys',
    tokens: [{"old":"/app/settings/api-keys","type":0,"val":"app","end":""},{"old":"/app/settings/api-keys","type":0,"val":"settings","end":""},{"old":"/app/settings/api-keys","type":0,"val":"api-keys","end":""}],
    types: placeholder as Registry['api-keys.index']['types'],
  },
  'api-keys.store': {
    methods: ["POST"],
    pattern: '/app/settings/api-keys',
    tokens: [{"old":"/app/settings/api-keys","type":0,"val":"app","end":""},{"old":"/app/settings/api-keys","type":0,"val":"settings","end":""},{"old":"/app/settings/api-keys","type":0,"val":"api-keys","end":""}],
    types: placeholder as Registry['api-keys.store']['types'],
  },
  'api-keys.revoke': {
    methods: ["DELETE"],
    pattern: '/app/settings/api-keys/:id',
    tokens: [{"old":"/app/settings/api-keys/:id","type":0,"val":"app","end":""},{"old":"/app/settings/api-keys/:id","type":0,"val":"settings","end":""},{"old":"/app/settings/api-keys/:id","type":0,"val":"api-keys","end":""},{"old":"/app/settings/api-keys/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['api-keys.revoke']['types'],
  },
  'api-keys.revokePost': {
    methods: ["POST"],
    pattern: '/app/settings/api-keys/:id/revoke',
    tokens: [{"old":"/app/settings/api-keys/:id/revoke","type":0,"val":"app","end":""},{"old":"/app/settings/api-keys/:id/revoke","type":0,"val":"settings","end":""},{"old":"/app/settings/api-keys/:id/revoke","type":0,"val":"api-keys","end":""},{"old":"/app/settings/api-keys/:id/revoke","type":1,"val":"id","end":""},{"old":"/app/settings/api-keys/:id/revoke","type":0,"val":"revoke","end":""}],
    types: placeholder as Registry['api-keys.revokePost']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
