import env from '#start/env'
import geoEnrichment from '#services/geo_enrichment_service'
import app from '@adonisjs/core/services/app'

// Only in the HTTP server process — not during `ace build` / migrations / tests.
if (app.getEnvironment() === 'web' && env.get('NODE_ENV') !== 'test') {
  geoEnrichment.start()
}
