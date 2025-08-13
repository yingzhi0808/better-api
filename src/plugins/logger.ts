import type { MiddlewareHandler } from 'hono'
import { logger as honoLogger } from 'hono/logger'

export type LoggerOptions = Parameters<typeof honoLogger>[0]

export function logger(options?: LoggerOptions): MiddlewareHandler {
  return honoLogger(options)
}
