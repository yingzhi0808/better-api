import http from 'node:http'
import { getRequestListener } from '@hono/node-server'
// import { createNodeWebSocket } from "@hono/node-ws";
import z from 'zod'
import {
  addGlobalResponse,
  configureOpenAPI,
  setGlobalSecurity,
  setSecuritySchemes,
} from '@/core/openapi'
import { BetterAPI } from '@/hono/api'
import { mountSwaggerUI } from './plugins/hono-swagger'

/* ---------- 使用示例 ---------- */
const app = new BetterAPI()
const honoApp = app.getInstance()

// 挂载 OpenAPI 和 Swagger UI（/openapi.json, /docs, /docs 静态资源）
mountSwaggerUI(honoApp, { docsPath: '/docs', openapiPath: '/openapi.json' })

// 配置全局 OpenAPI 信息与安全、默认错误响应
configureOpenAPI({
  info: { title: 'Demo API', version: '1.0.0' },
  servers: [{ url: '/' }],
  tags: [{ name: 'articles' }],
})
setSecuritySchemes({ bearerAuth: { type: 'http', scheme: 'bearer' } })
setGlobalSecurity([{ bearerAuth: [] }])
addGlobalResponse('500', z.object({ detail: z.string() }))

// 可选：设置全局 OpenAPI 元信息、服务器等（演示）
// import { configureOpenAPI, setGlobalSecurity, setSecuritySchemes, addGlobalResponse } from "@/core/openapi";
// configureOpenAPI({
//   info: { title: "Demo API", version: "1.0.0" },
//   servers: [{ url: "/" }],
//   tags: [{ name: "articles" }],
// });
// setSecuritySchemes({
//   bearerAuth: { type: "http", scheme: "bearer" },
// });
// setGlobalSecurity([{ bearerAuth: [] }]);
// addGlobalResponse("500", z.object({ detail: z.string() }));

// 1. 定义多状态码响应模式
// app.post(
//   "/entry/:id",
//   async (c) => {
//     const isSuccess = Math.random() > 0.5;
//     return isSuccess
//       ? c.json(
//           {
//             id: "1",
//             name: "John",
//             avatar: "https://example.com/avatar.png",
//             age: 10,
//           },
//           200,
//         )
//       : c.json({ error: "Invalid request", a: 10 }, 400);
//   },
//   {
//     response: {
//       200: z.object({
//         id: z.string().meta({ description: "用户 ID", example: "1" }),
//         name: z.string().meta({ description: "用户名", example: "Alice" }),
//         avatar: z
//           .string()
//           .meta({
//             description: "用户头像",
//             example: "https://example.com/avatar.png",
//           }),
//       }),
//       400: z.object({
//         error: z
//           .string()
//           .meta({ description: "错误信息", example: "Invalid request" }),
//       }),
//     },
//   },
// );

// const UserVO = z
//   .object({
//     id: z.number().meta({ description: "用户 ID", example: 1 }),
//     name: z.string().meta({ description: "用户名", example: "Alice" }),
//     age: z.number().meta({ description: "用户年龄", example: 10 }),
//   })
//   .meta({ responseDescription: "用户信息" });

// // 2. 定义单一响应模式
// app.post(
//   "/user",
//   () => {
//     return {
//       id: 1,
//       name: "Alice",
//       age: 10,
//     };
//   },
//   {
//     response: UserVO,
//   },
// );

// 3. 无响应模式验证
// app.post("/simple", (c) => c.json({ message: "Hello World" }, 201));

// （SSE 已移除）

// // 批量挂载示例
// app.mountMany([
//   defineRoute({
//     method: "get",
//     path: "/health",
//     handler: (c) => c.json({ ok: true }),
//     // 这里不提供 schema，让泛型默认为 undefined，避免严格协变冲突
//   }),
// ]);

// // 5. Depends 示例与多形态 schema（params/query/headers/cookies/body）
// const currentUserBase = dep(async ({ hono }) => {
//   const auth = hono.req.header("authorization");
//   if (!auth) {
//     return { id: "guest", name: "Guest" } as const;
//   }
//   return { id: "u_1", name: "Alice", scopes: ["articles:write"] } as const;
// });
// const currentUser = bearerAuth(currentUserBase, ["articles:write"]);

app.post(
  '/articles/:id',
  async (c) => {
    console.log(c.cookies.sid)
    // const me = await c.deps.currentUser;
    return c.json(
      {
        id: c.params.id,
        // me,
        query: c.query,
        headers: c.headers,
        cookies: c.cookies,
        body: c.body,
      },
      201,
    )
  },
  {
    summary: '创建文章',
    description: '演示 params/query/headers/cookies/body 与 Depends 的联合使用',
    tags: ['articles'],
    operationId: 'createArticle',
    params: z.object({
      id: z.string().min(1).default('123').meta({
        description: '文章 ID',
        example: '456',
      }),
    }),
    body: z.object({ title: z.string(), content: z.string().min(1) }),
    response: z
      .object({
        id: z.string(),
        query: z.any(),
        headers: z.any(),
        cookies: z.any(),
        body: z.any(),
      })
      .meta({ responseDescription: '创建文章' }),
  },
)

const server = http.createServer(getRequestListener(honoApp.fetch))
server.listen(3000)
