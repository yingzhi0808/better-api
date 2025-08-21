import type {
  BetterApiResponses,
  ResponsesDefinition,
  SimplifiedZodOpenApiResponseObject,
  ZodOpenApiResponseObject,
  ZodOpenApiResponsesObject,
} from '@/types/response'
import { isZodType } from '@/utils/zod'

// 辅助函数：判断是否为ZodResponseConfig
export function isSimplifiedZodResponseObject(
  obj: unknown,
): obj is SimplifiedZodOpenApiResponseObject {
  return obj !== null && typeof obj === 'object' && 'schema' in obj
}

// 辅助函数：判断是否为ZodResponseObject
export function isZodResponseObject(
  obj: unknown,
): obj is ZodOpenApiResponseObject {
  return obj !== null && typeof obj === 'object' && 'content' in obj
}

// 辅助函数：判断是否为ResponseConfigMap
export function isStatusResponseMap(obj: unknown): obj is BetterApiResponses {
  if (obj === null || typeof obj !== 'object') {
    return false
  }

  return Object.values(obj).some(
    (val) =>
      isZodType(val) ||
      isSimplifiedZodResponseObject(val) ||
      isZodResponseObject(val),
  )
}

// 转换响应配置为统一的ZodResponseObject格式
export function normalizeZodOpenApiResponses(
  responses: ResponsesDefinition,
): ZodOpenApiResponsesObject {
  // 情况1: 直接的ZodType -> 转换为200状态码
  if (isZodType(responses)) {
    return {
      200: {
        content: {
          'application/json': {
            schema: responses,
          },
        },
      },
    }
  }

  // 情况2: SimplifiedZodOpenApiResponseObject -> 转换为200状态码
  if (isSimplifiedZodResponseObject(responses)) {
    const { schema, links, description, headers, ...rest } = responses
    return {
      200: {
        links,
        description,
        headers,
        content: {
          'application/json': {
            schema,
            ...rest,
          },
        },
      },
    }
  }

  // 情况3: ZodOpenApiResponseObject -> 转换为200状态码
  if (isZodResponseObject(responses)) {
    return {
      200: responses,
    }
  }

  // 情况4: StatusResponseMap -> 转换每个状态码
  if (isStatusResponseMap(responses)) {
    const result: ZodOpenApiResponsesObject = {}
    for (const [statusCode, config] of Object.entries(responses)) {
      const status = statusCode as `${1 | 2 | 3 | 4 | 5}${string}`

      if (isZodType(config)) {
        result[status] = {
          description: '',
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

  return {}
}
