import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { definePlugin, html, serveStatic } from 'h3'
import { generateOpenAPI } from '@/core/openapi'
import { generateSwaggerUIHTML, getSwaggerUIAssetDir } from '@/core/swagger'

export interface SwaggerOptions {
  /**
   * 指定 Swagger UI 的访问路径
   */
  path?: string
}

export const swagger = definePlugin((h3, options?: SwaggerOptions) => {
  const defaultOptions: SwaggerOptions = {
    path: '/swagger',
  }
  const { path: swaggerPath } = { ...defaultOptions, ...options }

  const assetDir = getSwaggerUIAssetDir()

  h3.use(`${swaggerPath}/**`, (event) => {
    return serveStatic(event, {
      indexNames: [],
      getContents: (id) => {
        if (id === swaggerPath) {
          const swaggerUIHTML = generateSwaggerUIHTML()
          return html(event, swaggerUIHTML)
        }

        if (id === '/swagger.css') {
          id = '/index.css'
        }

        return readFile(path.join(assetDir, id))
      },
      getMeta: async (id) => {
        if (id === swaggerPath) {
          return {}
        }

        if (id === '/swagger.css') {
          id = '/index.css'
        }

        const stats = await stat(path.join(assetDir, id))
        if (stats?.isFile()) {
          return {
            size: stats.size,
            mtime: stats.mtimeMs,
          }
        }

        return undefined
      },
    })
  })

  h3.get('/openapi.json', () => {
    return generateOpenAPI()
  })
})
