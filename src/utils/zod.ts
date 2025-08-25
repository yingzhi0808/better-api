import type { ZodObject, ZodType } from 'zod'

export function isZodType(obj: unknown): obj is ZodType {
  return typeof obj === 'object' && obj !== null && '_zod' in obj
}

/**
 * 合并全局参数和路由特定参数，用于参数校验
 */
export function mergeZodObjects(global?: ZodObject, local?: ZodObject) {
  if (!global && !local) {
    return undefined
  }

  if (!global) {
    return local
  }

  if (!local) {
    return global
  }

  return local.extend(global.shape)
}
