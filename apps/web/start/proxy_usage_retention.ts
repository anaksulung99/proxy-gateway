import env from '#start/env'
import proxyUsageRetention from '#services/proxy_usage_retention_service'
import app from '@adonisjs/core/services/app'

if (app.getEnvironment() === 'web' && env.get('NODE_ENV') !== 'test') {
  proxyUsageRetention.start()
}
