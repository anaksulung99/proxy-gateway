import '@adonisjs/inertia/types'

import type { VNodeProps, AllowedComponentProps, ComponentInstance } from 'vue'

type ExtractProps<T> = Omit<
  ComponentInstance<T>['$props'],
  keyof VNodeProps | keyof AllowedComponentProps
>

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'analytics/index': ExtractProps<(typeof import('../../inertia/pages/analytics/index.vue'))['default']>
    'auth/forgot-password': ExtractProps<(typeof import('../../inertia/pages/auth/forgot-password.vue'))['default']>
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.vue'))['default']>
    'auth/reset-password': ExtractProps<(typeof import('../../inertia/pages/auth/reset-password.vue'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.vue'))['default']>
    'auth/verify-email': ExtractProps<(typeof import('../../inertia/pages/auth/verify-email.vue'))['default']>
    'dashboard/index': ExtractProps<(typeof import('../../inertia/pages/dashboard/index.vue'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.vue'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.vue'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.vue'))['default']>
    'proxy-lists/import': ExtractProps<(typeof import('../../inertia/pages/proxy-lists/import.vue'))['default']>
    'proxy-lists/index': ExtractProps<(typeof import('../../inertia/pages/proxy-lists/index.vue'))['default']>
    'proxy-lists/show': ExtractProps<(typeof import('../../inertia/pages/proxy-lists/show.vue'))['default']>
    'scraper/index': ExtractProps<(typeof import('../../inertia/pages/scraper/index.vue'))['default']>
    'scraper/logs': ExtractProps<(typeof import('../../inertia/pages/scraper/logs.vue'))['default']>
    'settings/api_keys': ExtractProps<(typeof import('../../inertia/pages/settings/api_keys.vue'))['default']>
    'settings/team': ExtractProps<(typeof import('../../inertia/pages/settings/team.vue'))['default']>
    'tools/index': ExtractProps<(typeof import('../../inertia/pages/tools/index.vue'))['default']>
    'tools/show': ExtractProps<(typeof import('../../inertia/pages/tools/show.vue'))['default']>
    'dashboard/runtime_quarantine': ExtractProps<(typeof import('../../inertia/pages/dashboard/runtime_quarantine.vue'))['default']>
  }
}
