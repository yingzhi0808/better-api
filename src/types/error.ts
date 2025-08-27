import type { Context } from 'hono'
import type { ZodError } from 'zod'

export type ErrorHandler<T extends Error> = (
  err: T,
  c: Context,
) => Response | Promise<Response>

export type ValidationErrors = Record<string, ZodError>
