/** 将 Hono 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}` */
export function convertExpressPathToOpenAPI(path: string) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
}
