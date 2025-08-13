import { relative } from 'node:path'
import { serveStatic } from '@hono/node-server/serve-static'
import type { Hono } from 'hono'
import { generateOpenAPI } from '@/core/openapi'
import { generateSwaggerUIHTML, getSwaggerUIAssetDir } from '@/core/swagger'

export interface HonoSwaggerOptions {
  /** Swagger UI HTML 的访问路径，默认 "/docs" */
  docsPath?: string
  /** OpenAPI JSON 的访问路径，默认 "/openapi.json" */
  openapiPath?: string
  /** 传入 HTML 里使用的 OpenAPI 文档 URL，默认与 openapiPath 一致 */
  openapiUrl?: string
  /** HTML 标题 */
  title?: string
  /** 是否持久化授权 */
  persistAuthorization?: boolean
}

/**
 * 在 Hono 应用上挂载 Swagger UI（静态资源 + HTML）与 openapi.json 三条路由。
 */
export function mountSwaggerUI(app: Hono, options?: HonoSwaggerOptions) {
  const assetDir = getSwaggerUIAssetDir()
  const relativePath = relative(process.cwd(), assetDir)

  app.use('/*', serveStatic({ root: relativePath }))

  app.get('/swagger', (c) => {
    const html = generateSwaggerUIHTML(options)
    return c.html(html)
  })

  app.get('/openapi.json', async (c) => {
    return c.json(generateOpenAPI())
  })
}
