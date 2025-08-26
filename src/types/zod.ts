import type { $ZodIssue } from 'zod/v4/core'

// 验证错误的类型定义
export interface ValidationErrors {
  params?: $ZodIssue[]
  query?: $ZodIssue[]
  headers?: $ZodIssue[]
  cookies?: $ZodIssue[]
  body?: $ZodIssue[]
  form?: $ZodIssue[]
  file?: $ZodIssue[]
  files?: $ZodIssue[]
}
