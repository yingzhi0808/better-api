import { readFile } from 'node:fs/promises'
import path from 'node:path'
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
  const docsPath = options?.docsPath ?? '/docs'
  const openapiPath = options?.openapiPath ?? '/openapi.json'
  const openapiUrl = options?.openapiUrl ?? openapiPath

  const assetDir = getSwaggerUIAssetDir()

  // 1) OpenAPI JSON
  app.get(openapiPath, (c) => c.json(generateOpenAPI()))

  // 2) Swagger UI HTML（相对 docsPath 引用静态资源）
  app.get(docsPath, (c) =>
    c.html(
      generateSwaggerUIHTML({
        url: openapiUrl,
        title: options?.title ?? 'Swagger UI',
        persistAuthorization: options?.persistAuthorization ?? false,
      }),
    ),
  )

  // 3) 静态资源：将 `${docsPath}/*` 映射到 swagger-ui-dist 目录
  app.use(
    `${docsPath}/*`,
    serveStatic({
      root: assetDir,
      rewriteRequestPath: (p) => p.replace(new RegExp(`^${docsPath}`), ''),
    }),
  )

  // 兼容自定义样式路径 /swagger.css -> /index.css
  app.get(`${docsPath}/swagger.css`, async (_c) => {
    const filePath = path.join(assetDir, 'index.css')
    const buf = await readFile(filePath)
    return new Response(buf, { headers: { 'content-type': 'text/css' } })
  })
}
