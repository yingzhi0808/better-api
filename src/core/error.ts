import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ValidationErrors } from '@/types/error'

/**
 * 验证错误类，用于处理 Zod 校验失败的情况
 */
export class ValidationError extends HTTPException {
  constructor(
    public readonly errors: ValidationErrors,
    status: ContentfulStatusCode = 400,
    options?: ConstructorParameters<typeof HTTPException>[1],
  ) {
    super(status, options)
  }
}
