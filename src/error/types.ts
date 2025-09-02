import type { Context } from 'hono'
import type { CustomHeader, ResponseHeader } from 'hono/utils/headers'
import type { ZodError } from 'zod'

export interface HTTPExceptionOptions {
  cause?: unknown
  message?: string
  headers?: Record<ResponseHeader | CustomHeader, string>
}

export type ErrorHandler<T extends Error> = (err: T, c: Context) => Response | Promise<Response>

export type ValidationErrors = Record<string, ZodError>
