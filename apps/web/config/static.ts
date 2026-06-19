import { defineConfig } from '@adonisjs/static'

const staticServerConfig = defineConfig({
  enabled: true,
  etag: true,
  lastModified: true,
  dotFiles: 'ignore',
  headers: (path) => {
    const headers: Record<string, any> = {}
    if (path.endsWith('.mc2')) {
      Object.assign(headers, {
        'content-type': 'application/octet-stream',
      })
    }
    if (path.endsWith('.html')) {
      Object.assign(headers, {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      })
    }
    if (path.endsWith('.css')) {
      Object.assign(headers, {
        'content-type': 'text/css',
      })
    }
    if (path.endsWith('.js')) {
      Object.assign(headers, {
        'content-type': 'application/javascript',
      })
    }
    if (path.endsWith('.json')) {
      Object.assign(headers, {
        'content-type': 'application/json',
      })
    }
    // images png, jpg, jpeg we need to set content-type
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      Object.assign(headers, {
        'content-type': 'image/png',
      })
    }

    // favicon.ico we need to set content-type
    if (path.endsWith('.ico')) {
      Object.assign(headers, {
        'content-type': 'image/x-icon',
      })
    }

    return headers
  },
})

export default staticServerConfig
