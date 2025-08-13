import type { MiddlewareHandler } from 'hono'
import { cors as honoCors } from 'hono/cors'

export type CorsOptions = Parameters<typeof honoCors>[0]

export function cors(options?: CorsOptions): MiddlewareHandler {
  return honoCors(options)
}
