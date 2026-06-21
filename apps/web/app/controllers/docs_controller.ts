import app from '@adonisjs/core/services/app'
import type { HttpContext } from '@adonisjs/core/http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default class DocsController {
  async externalProxyTesting({ inertia }: HttpContext) {
    const sourcePath = resolve(
      app.makePath(),
      '..',
      '..',
      'docs',
      'external-project-proxy-testing.md'
    )

    const content = await readFile(sourcePath, 'utf8')

    return inertia.render('docs/external_proxy_testing', {
      title: 'External Project Proxy Testing',
      description:
        'Panduan internal untuk curl, Playwright, Crawlee, dan cara membaca Tunnel Diagnostics saat testing external project.',
      sourcePath,
      content,
    })
  }
}
