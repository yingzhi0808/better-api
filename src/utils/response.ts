// 导入类型定义

import type { StatusCode } from 'hono/utils/http-status'
import type { ResponseSpec, StatusResponseMap } from '@/hono/api'
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

// 转换响应配置为统一的ZodResponseObject格式
export function convertResponseSchema(response: ResponseSpec) {
  if (!response) {
    return undefined
  }

  if (isZodType(response)) {
    return {
      200: {
        content: {
          'application/json': {
            schema: response,
          },
        },
      },
    }
  }

  if (isStatusResponseMap(response)) {
    const result: Partial<Record<StatusCode, ZodResponseObject>> = {}
    for (const [statusCode, config] of Object.entries(response)) {
      const status = Number(statusCode) as StatusCode

      if (isZodType(config)) {
        result[status] = {
          content: {
            'application/json': {
              schema: config,
            },
          },
        }
      } else if (isSimplifiedZodResponseObject(config)) {
        const { schema, links, description, headers, ...rest } = config
        result[status] = {
          links,
          description,
          headers,
          content: {
            'application/json': {
              schema,
              ...rest,
            },
          },
        }
      } else if (isZodResponseObject(config)) {
        result[status] = config
      }
    }
    return result
  }

  return undefined
}
