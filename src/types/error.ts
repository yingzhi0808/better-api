import type { ErrorHandler } from 'hono'

/**
 * 错误处理器映射表类型
 */
export type ErrorHandlerMap = Map<
  new (
    ...args: unknown[]
  ) => Error,
  ErrorHandler
>
