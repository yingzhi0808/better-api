<div align="center">
  <h1>BetterAPI (Hono + Zod + OpenAPI)</h1>
  <p>TypeScript 优先的极简 API 运行时与 OpenAPI 生成工具</p>
</div>

一个现代化的 TypeScript 优先的 OpenAPI 文档生成器与轻量运行时“BetterAPI”。在保持强类型与最小侵入的前提下，提供 Hono 适配、Zod 运行时校验、DI（Depends 风格）、OpenAPI 生成、Swagger-UI、SSE/WS、内置中间件等能力。

## 功能概览

- 路由注册与强类型上下文
  - `app.get/post/put/delete/patch/options/head/trace(path, handler, schema?)`
  - `Context` 提供 `params/query/headers/cookies/body/dependencies/after/sse`
  - 运行时校验：`params/query/headers/cookies/body` 传入 Zod Schema 自动校验
  - 响应校验：`response` 可为单一 schema 或 `{ 200: zod, 400: zod }`

- OpenAPI 生成与文档
  - 自动从路由与 schema 生成 OpenAPI 3 文档
  - 支持 `summary/description/tags/operationId/deprecated/security`
  - 支持 `parameters`（path/query/header/cookie）与 `requestBody`
  - `bodyContentTypes` 支持 `application/json`、`multipart/form-data`、`application/x-www-form-urlencoded`
  - multipart 文件字段标记为 `type: string, format: binary`
  - 全局配置：`configureOpenAPI`、`setSecuritySchemes`、`setGlobalSecurity`、`addGlobalResponse`

- DI/Depends 与鉴权
  - `dep(fn)` 声明 Provider；请求级缓存；可互相依赖
  - `requiresAuth(scheme, provider, scopes?)` 与 `bearerAuth(provider, scopes?)`
  - 从 `dependencies` 自动推导 OpenAPI `security`（或手动传 `schema.security`）

- SSE/WS
  - `app.sse(path, handler)` + `Context.sse({ retry? })` 返回 `text/event-stream`
  - `app.ws(path, on)`（基于 `@hono/node-ws`），在 `server.ts` 注入 `injectWebSocket(server)`

- 内置中间件（薄封装）
  - `cors(options?)`、`compress(options?)`、`logger(options?)`、`rateLimit({ tokens, window, redis... })`

- DX 辅助
  - `defineRoute({ method, path, handler, schema })` + `app.mount(def)`/`app.mountMany(defs)`
  - `group('/prefix', { tags, dependencies }, g => { g.get(...); g.mountMany([...]) })`

## 目录结构

```
src/
  better-api/
    adapters/
      hono.ts
    core/
      di.ts
      errors.ts
      openapi.ts
    hono/
      api.ts
      route.ts
  plugins/
    cors.ts
    compress.ts
    logger.ts
    rate-limit.ts
    index.ts
  server.ts
```

> 当前实现主要位于 `src/hono/*` 与 `src/core/*`，将逐步迁移进 `better-api/*`，不影响使用。

## 快速开始（Hono 适配）

```ts
// server.ts（节选）
import { getRequestListener } from '@hono/node-server'
import http from 'node:http'
import { createNodeWebSocket } from '@hono/node-ws'
import z from 'zod'
import { BetterAPI } from '@/hono/api'
import { mountSwaggerUI } from '@/plugins/swagger'

const app = new BetterAPI()
const hono = app.getInstance()

mountSwaggerUI(hono, { docsPath: '/docs', openapiPath: '/openapi.json' })

// SSE 路由
app.sse('/events', (c) => c.sse({ retry: 1000 }))

// 简单路由
app.get('/hello/:name', (c) => c.json({ msg: `hello ${c.params.name}` }), {
  params: z.object({ name: z.string() }),
  response: z.object({ msg: z.string() })
})

// multipart 上传
app.post('/upload', (c) => c.json({ ok: true, body: c.body }), {
  body: z.object({ file: z.any(), desc: z.string().optional() }),
  bodyContentTypes: ['multipart/form-data'],
  bodyFileFields: ['file'],
  response: z.object({ ok: z.boolean(), body: z.any() })
})

const server = http.createServer(getRequestListener(hono.fetch))
const { injectWebSocket } = createNodeWebSocket({ app: hono })
injectWebSocket(server)
server.listen(3000)
```

## 依赖注入与鉴权

```ts
import { dep, bearerAuth } from '@/core/di'
import z from 'zod'

const baseUser = dep(async ({ hono }) => {
  const auth = hono.req.header('authorization')
  if (!auth) return { id: 'guest', name: 'Guest' } as const
  return { id: 'u_1', name: 'Alice', scopes: ['articles:write'] } as const
})
const currentUser = bearerAuth(baseUser, ['articles:write'])

app.post('/articles/:id', async (c) => {
  const me = await c.dependencies!.currentUser
  c.after(() => {/* 审计日志 */})
  return c.json({ id: c.params.id, me, body: c.body }, 201)
}, {
  params: z.object({ id: z.string() }),
  body: z.object({ title: z.string(), content: z.string().min(1) }),
  dependencies: { currentUser },
  response: z.object({ id: z.string(), me: z.any(), body: z.any() })
})
```

## 插件用法

```ts
import { cors, compress, logger, rateLimit } from '@/plugins'

const app = new BetterAPI()
const hono = app.getInstance()

hono.use('*', logger())
hono.use('*', cors())
hono.use('*', compress())
// hono.use('*', rateLimit({ redisUrl: '...', redisToken: '...', tokens: 100, window: '1 m' }))
```

## OpenAPI 全局配置

```ts
import { configureOpenAPI, setSecuritySchemes, setGlobalSecurity, addGlobalResponse } from '@/core/openapi'
import z from 'zod'

configureOpenAPI({ info: { title: 'Demo API', version: '1.0.0' }, servers: [{ url: '/' }], tags: [{ name: 'articles' }] })
setSecuritySchemes({ bearerAuth: { type: 'http', scheme: 'bearer' } })
setGlobalSecurity([{ bearerAuth: [] }])
addGlobalResponse('500', z.object({ detail: z.string() }))
```

## 路由辅助与批量挂载

```ts
import { defineRoute } from '@/hono/route'

app.mountMany([
  defineRoute({ method: 'get', path: '/health', handler: (c) => c.json({ ok: true }) }),
])

app.group('/v1', { tags: ['v1'] }, (g) => {
  g.get('/ping', (c) => c.json({ pong: true }), { response: z.object({ pong: z.boolean() }) })
})
```

## 路线图

- 抽离 `better-api/*` 为独立包，提供多适配（Hono/Fastify）
- AsyncAPI 生成（WS/SSE 说明）
- 中间件 preset 组合与更多内置中间件
- 测试覆盖与文档完善

