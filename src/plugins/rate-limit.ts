import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { MiddlewareHandler } from 'hono'

export interface RateLimitOptions {
  redisUrl: string
  redisToken: string
  tokens: number
  window: `${number} ${'s' | 'm' | 'h' | 'd'}` // e.g. '1 m'
  key?: (ip: string) => string
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const redis = new Redis({ url: options.redisUrl, token: options.redisToken })
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(options.tokens, options.window),
  })
  return async (c, next): Promise<Response | undefined> => {
    const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
    const key = options.key ? options.key(ip) : ip
    const { success } = await limiter.limit(key)
    if (!success) {
      return c.text('Too Many Requests', 429)
    }
    await next()
    return undefined
  }
}
