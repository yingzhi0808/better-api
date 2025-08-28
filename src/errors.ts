import http from 'node:http'
import { HTTPException as HonoHTTPException } from 'hono/http-exception'
import type { CustomHeader, ResponseHeader } from 'hono/utils/headers'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { JSONResponse } from './core/response'
import type { ValidationErrors } from './types/error'

export interface HTTPExceptionOptions {
  cause?: unknown
  message?: string
  headers?: Record<ResponseHeader | CustomHeader, string>
}

/**
 * HTTP 异常类，用于在代码中抛出异常向客户端显示错误信息
 */
export class HTTPException extends HonoHTTPException {
  constructor(
    status: ContentfulStatusCode,
    response: string | Record<string, unknown> = http.STATUS_CODES[status]!,
    options?: HTTPExceptionOptions,
  ) {
    const body = typeof response === 'string' ? { message: response } : response
    const res = new JSONResponse(body, {
      status,
      headers: options?.headers,
    })

    super(status, {
      res,
      cause: options?.cause,
      message:
        options?.message ??
        (typeof body.message === 'string'
          ? body.message
          : http.STATUS_CODES[status]!),
    })

    this.name = this.constructor.name
  }
}

/**
 * 验证错误类，用于处理 Zod 校验失败的情况
 */
export class ValidationError extends HTTPException {
  constructor(
    status: ContentfulStatusCode,
    public readonly errors: ValidationErrors,
    options?: HTTPExceptionOptions,
  ) {
    const errorResponse = Object.entries(errors).flatMap(([key, zodError]) =>
      zodError.issues.map((issue) => ({
        in: key,
        ...issue,
      })),
    )

    super(status, { error: errorResponse, message: options?.message }, options)
  }
}

export class RequestValidationError extends ValidationError {
  constructor(
    status: ContentfulStatusCode,
    errors: ValidationErrors,
    options?: HTTPExceptionOptions,
  ) {
    super(status, errors, {
      message: 'Request validation failed',
      ...options,
    })
  }
}

export class ResponseValidationError extends ValidationError {
  constructor(
    status: ContentfulStatusCode,
    errors: ValidationErrors,
    options?: HTTPExceptionOptions,
  ) {
    super(status, errors, {
      message: 'Response validation failed',
      ...options,
    })
  }
}
