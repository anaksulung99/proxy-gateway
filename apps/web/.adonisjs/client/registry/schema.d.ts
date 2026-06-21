/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'home.index': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['index']>>>
    }
  }
  'home.about': {
    methods: ["GET","HEAD"]
    pattern: '/about'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['about']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['about']>>>
    }
  }
  'home.contact': {
    methods: ["GET","HEAD"]
    pattern: '/contact'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['contact']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['contact']>>>
    }
  }
  'home.pricing': {
    methods: ["GET","HEAD"]
    pattern: '/pricing'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['pricing']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['pricing']>>>
    }
  }
  'home.terms': {
    methods: ["GET","HEAD"]
    pattern: '/terms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['terms']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['terms']>>>
    }
  }
  'home.privacy': {
    methods: ["GET","HEAD"]
    pattern: '/privacy'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['privacy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['privacy']>>>
    }
  }
  'home.faqs': {
    methods: ["GET","HEAD"]
    pattern: '/faqs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['faqs']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['faqs']>>>
    }
  }
  'home.contact.store': {
    methods: ["POST"]
    pattern: '/contact'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/home').contactValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/home').contactValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/home_controller').default['storeContact']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/home_controller').default['storeContact']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password.forgot': {
    methods: ["GET","HEAD"]
    pattern: '/forgot-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['forgotPassword']>>>
    }
  }
  'password.email': {
    methods: ["POST"]
    pattern: '/forgot-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').emailValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').emailValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['sendResetLink']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['sendResetLink']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password.reset': {
    methods: ["GET","HEAD"]
    pattern: '/reset-password/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resetPassword']>>>
    }
  }
  'password.update': {
    methods: ["POST"]
    pattern: '/reset-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['updatePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['updatePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'email.notice': {
    methods: ["GET","HEAD"]
    pattern: '/verify-email'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verificationNotice']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verificationNotice']>>>
    }
  }
  'email.resend': {
    methods: ["POST"]
    pattern: '/verify-email/resend'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resendVerification']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['resendVerification']>>>
    }
  }
  'email.verify': {
    methods: ["GET","HEAD"]
    pattern: '/verify-email/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth_controller').default['verifyEmail']>>>
    }
  }
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/app'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
    }
  }
  'dashboard.tasks': {
    methods: ["GET","HEAD"]
    pattern: '/app/runtime/tasks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['activeTasks']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['activeTasks']>>>
    }
  }
  'dashboard.runtimeQuarantine': {
    methods: ["GET","HEAD"]
    pattern: '/app/runtime/quarantine'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['runtimeQuarantine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['runtimeQuarantine']>>>
    }
  }
  'proxy-lists.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/proxy-lists'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['index']>>>
    }
  }
  'proxy-lists.store': {
    methods: ["POST"]
    pattern: '/app/proxy-lists'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_list').createProxyListValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_list').createProxyListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.show': {
    methods: ["GET","HEAD"]
    pattern: '/app/proxy-lists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['show']>>>
    }
  }
  'proxy-lists.update': {
    methods: ["PATCH"]
    pattern: '/app/proxy-lists/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_list').updateProxyListValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_list').updateProxyListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.bulkDestroy': {
    methods: ["DELETE"]
    pattern: '/app/proxy-lists/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_list').deleteProxyListValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_list').deleteProxyListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['bulkDestroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['bulkDestroy']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.updatePost': {
    methods: ["POST"]
    pattern: '/app/proxy-lists/:id/update'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_list').updateProxyListValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_list').updateProxyListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.destroy': {
    methods: ["DELETE"]
    pattern: '/app/proxy-lists/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['destroy']>>>
    }
  }
  'proxy-lists.rotation': {
    methods: ["PUT"]
    pattern: '/app/proxy-lists/:id/rotation'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rotation_config').rotationConfigValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rotation_config').rotationConfigValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['updateRotation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['updateRotation']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.rotationPost': {
    methods: ["POST"]
    pattern: '/app/proxy-lists/:id/rotation'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/rotation_config').rotationConfigValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/rotation_config').rotationConfigValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['updateRotation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['updateRotation']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.import': {
    methods: ["POST"]
    pattern: '/app/proxy-lists/:id/import'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_import').proxyImportValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_import').proxyImportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['import']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_lists_controller').default['import']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-lists.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/proxy-lists/:id/export'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['export']>>>
    }
  }
  'proxy-entries.bulk': {
    methods: ["POST"]
    pattern: '/app/proxy-entries/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_entry').bulkActionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_entry').bulkActionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['bulk']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['bulk']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-entries.runReBulkCheck': {
    methods: ["POST"]
    pattern: '/app/proxy-entries/bulk/recheck'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_entry').recheckBulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_entry').recheckBulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['runReBulkCheck']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['runReBulkCheck']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'proxy-entries.deleteManyByStatusPost': {
    methods: ["DELETE"]
    pattern: '/app/proxy-entries/bulk/delete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_entry').recheckBulkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_entry').recheckBulkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['deleteManyByStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_entries_controller').default['deleteManyByStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'analytics.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/analytics'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_usage_analytics_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_usage_analytics_controller').default['index']>>>
    }
  }
  'analytics.export': {
    methods: ["GET","HEAD"]
    pattern: '/app/analytics/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_usage_analytics_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_usage_analytics_controller').default['export']>>>
    }
  }
  'analytics.deleteManyPost': {
    methods: ["DELETE"]
    pattern: '/app/analytics/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/proxy_list').deleteProxyListValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/proxy_list').deleteProxyListValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/proxy_usage_analytics_controller').default['deleteMany']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/proxy_usage_analytics_controller').default['deleteMany']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tools.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/tools'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['index']>>>
    }
  }
  'tools.logs': {
    methods: ["GET","HEAD"]
    pattern: '/app/tools/logs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['logs']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['logs']>>>
    }
  }
  'tools.check': {
    methods: ["POST"]
    pattern: '/app/tools/check'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tools_check').toolsCheckValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tools_check').toolsCheckValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['check']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['check']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'tools.deleteManyPost': {
    methods: ["DELETE"]
    pattern: '/app/tools/check'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tools_check').deleteToolsCheckValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tools_check').deleteToolsCheckValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['deleteMany']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/tools_checker_controller').default['deleteMany']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'scraper.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/scraper'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['index']>>>
    }
  }
  'scraper.logs': {
    methods: ["GET","HEAD"]
    pattern: '/app/scraper/logs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['logs']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['logs']>>>
    }
  }
  'scraper.update': {
    methods: ["PATCH"]
    pattern: '/app/scraper/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['update']>>>
    }
  }
  'scraper.updatePost': {
    methods: ["POST"]
    pattern: '/app/scraper/:id/update'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['update']>>>
    }
  }
  'scraper.run': {
    methods: ["POST"]
    pattern: '/app/scraper/:id/run'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['run']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['run']>>>
    }
  }
  'scraper.runEnabled': {
    methods: ["POST"]
    pattern: '/app/scraper/run-enabled'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['runEnabled']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['runEnabled']>>>
    }
  }
  'scraper.deleteManyPost': {
    methods: ["DELETE"]
    pattern: '/app/scraper/logs/delete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/scraper_run').deleteRunsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/scraper_run').deleteRunsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['deleteMany']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/scraper_sources_controller').default['deleteMany']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'api-keys.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/settings/api-keys'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['index']>>>
    }
  }
  'api-keys.store': {
    methods: ["POST"]
    pattern: '/app/settings/api-keys'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/api_key').createApiKeyValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/api_key').createApiKeyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'api-keys.revoke': {
    methods: ["DELETE"]
    pattern: '/app/settings/api-keys/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['revoke']>>>
    }
  }
  'api-keys.revokePost': {
    methods: ["POST"]
    pattern: '/app/settings/api-keys/:id/revoke'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['revoke']>>>
    }
  }
  'api-keys.quota': {
    methods: ["POST"]
    pattern: '/app/settings/api-keys/:id/quota'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/api_key').keyQuotaValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/api_key').keyQuotaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['updateQuota']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['updateQuota']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'api-keys.teamQuota': {
    methods: ["POST"]
    pattern: '/app/settings/team-quota'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/api_key').teamQuotaValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/api_key').teamQuotaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['updateTeamQuota']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/api_keys_controller').default['updateTeamQuota']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'teams.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/teams'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['index']>>>
    }
  }
  'teams.store': {
    methods: ["POST"]
    pattern: '/app/teams'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').inviteTeamValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').inviteTeamValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'teams.update': {
    methods: ["PATCH"]
    pattern: '/app/teams/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'teams.destroy': {
    methods: ["DELETE"]
    pattern: '/app/teams/:id/delete'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['destroy']>>>
    }
  }
  'teams.deleteManyPost': {
    methods: ["DELETE"]
    pattern: '/app/teams/bulk'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').deleteUsersValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').deleteUsersValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['deleteMany']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin_controller').default['deleteMany']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.index': {
    methods: ["GET","HEAD"]
    pattern: '/app/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['index']>>>
    }
  }
  'profile.update': {
    methods: ["PATCH"]
    pattern: '/app/profile/update'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateOwnProfiileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateOwnProfiileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.password': {
    methods: ["PATCH"]
    pattern: '/app/profile/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateProfilePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateProfilePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['password']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['password']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}
