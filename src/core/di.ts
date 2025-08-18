import { AsyncLocalStorage } from 'node:async_hooks'
import type { Context as HonoContext } from 'hono'

export interface ProviderContext {
  hono: HonoContext
  get: <T>(provider: Provider<T>) => Promise<T>
}

export type Provider<T> = (ctx: ProviderContext) => Promise<T> | T

export const kSecurityMeta: unique symbol = Symbol('securityMeta')

export interface SecurityMeta {
  scheme: string
  scopes?: string[]
}

export function requiresAuth<T>(
  scheme: string,
  provider: Provider<T>,
  scopes?: string[],
) {
  const wrapped: Provider<T> = async (ctx: ProviderContext) => {
    const user = await ctx.get(provider as Provider<unknown>)
    if (!user) {
      throw new Error('unauthorized')
    }
    if (scopes && scopes.length > 0) {
      const u = user as { scopes?: unknown }
      const userScopes: string[] = Array.isArray(u.scopes)
        ? (u.scopes as string[])
        : []
      const missing = scopes.filter((s) => !userScopes.includes(s))
      if (missing.length > 0) {
        throw new Error('forbidden')
      }
    }
    return user as T
  }
  ;(wrapped as unknown as Record<typeof kSecurityMeta, SecurityMeta>)[
    kSecurityMeta
  ] = {
    scheme,
    scopes,
  }
  return wrapped
}

export function bearerAuth<T>(provider: Provider<T>, scopes?: string[]) {
  return requiresAuth('bearerAuth', provider, scopes)
}

const storage = new AsyncLocalStorage<Map<Provider<unknown>, unknown>>()

export function runWithRequestScope<T>(fn: () => Promise<T> | T) {
  return storage.run(new Map(), fn)
}

export async function resolveProvider<T>(
  provider: Provider<T>,
  ctx: ProviderContext,
) {
  const store = storage.getStore()
  if (store) {
    const cached = store.get(provider)
    if (cached !== undefined) {
      return cached as T
    }
    const value = await provider(ctx)
    store.set(provider, value)
    return value
  }
  return provider(ctx)
}

export function dep<T>(fn: Provider<T>): Provider<T> {
  return fn
}

export type ProviderOutput<P> = P extends Provider<infer T> ? T : never
