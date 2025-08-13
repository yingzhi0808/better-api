import type { MiddlewareHandler } from 'hono'
import { compress as honoCompress } from 'hono/compress'

export type CompressOptions = Parameters<typeof honoCompress>[0]

export function compress(options?: CompressOptions): MiddlewareHandler {
  return honoCompress(options)
}
