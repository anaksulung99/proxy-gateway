import env from '#start/env'
import geoEnrichment from '#services/geo_enrichment_service'

if (env.get('NODE_ENV') !== 'test') {
  geoEnrichment.start()
}
