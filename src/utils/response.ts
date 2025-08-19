// 导入类型定义
import type { StatusResponseMap } from '@/hono/api'
import type {
  SimplifiedZodResponseObject,
  ZodResponseObject,
} from '@/types/zod'
import { isZodType } from '@/utils/zod'

// 辅助函数：判断是否为ZodResponseConfig
export function isSimplifiedZodResponseObject(
  obj: unknown,
): obj is SimplifiedZodResponseObject {
  return obj !== null && typeof obj === 'object' && 'schema' in obj
}

// 辅助函数：判断是否为ZodResponseObject
export function isZodResponseObject(obj: unknown): obj is ZodResponseObject {
  return obj !== null && typeof obj === 'object' && 'content' in obj
}

// 辅助函数：判断是否为ResponseConfigMap
export function isStatusResponseMap(obj: unknown): obj is StatusResponseMap {
  if (!obj || typeof obj !== 'object') {
    return false
  }
  // ResponseConfigMap现在可以包含ZodType、ZodResponseConfig或ZodResponseObject
  return Object.values(obj).some(
    (val) =>
      isZodType(val) ||
      isSimplifiedZodResponseObject(val) ||
      isZodResponseObject(val),
  )
}
