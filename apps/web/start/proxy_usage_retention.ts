import env from '#start/env'
import proxyUsageRetention from '#services/proxy_usage_retention_service'

if (env.get('NODE_ENV') !== 'test') {
  proxyUsageRetention.start()
}
