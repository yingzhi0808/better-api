import type { ZodOpenApiRequestBodyObject } from 'zod-openapi'
import { isZodType } from '@/utils/zod'
import type {
  BodySchema,
  ResponsesSchema,
  RouteResponses,
  SimpleZodOpenApiRequestBodyObject,
  SimpleZodOpenApiResponseObject,
  ZodOpenApiResponseObject,
  ZodOpenApiResponsesObject,
} from './types'

export function isSimpleZodOpenApiResponseObject(
  obj: unknown,
): obj is SimpleZodOpenApiResponseObject {
  return obj !== null && typeof obj === 'object' && 'schema' in obj
}

export function isZodOpenApiResponseObject(
  obj: unknown,
): obj is ZodOpenApiResponseObject {
  return obj !== null && typeof obj === 'object' && 'content' in obj
}

export function isRouteResponses(obj: unknown): obj is RouteResponses {
  if (obj === null || typeof obj !== 'object') {
    return false
  }

  return Object.values(obj).some(
    (val) =>
      isZodType(val) ||
      isSimpleZodOpenApiResponseObject(val) ||
      isZodOpenApiResponseObject(val),
  )
}

export function normalizeResponsesSchema(responses: ResponsesSchema) {
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

  if (isSimpleZodOpenApiResponseObject(responses)) {
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

  if (isZodOpenApiResponseObject(responses)) {
    return {
      200: responses,
    }
  }

  if (isRouteResponses(responses)) {
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
      } else if (isSimpleZodOpenApiResponseObject(config)) {
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
      } else if (isZodOpenApiResponseObject(config)) {
        result[status] = config
      }
    }
    return result
  }

  return undefined
}

export function isSimpleZodOpenApiRequestBodyObject(
  obj: unknown,
): obj is SimpleZodOpenApiRequestBodyObject {
  return obj !== null && typeof obj === 'object' && 'schema' in obj
}

export function isZodOpenApiRequestBodyObject(
  obj: unknown,
): obj is ZodOpenApiRequestBodyObject {
  return obj !== null && typeof obj === 'object' && 'content' in obj
}

export function normalizeBodySchema(body: BodySchema) {
  if (isZodType(body)) {
    return {
      required: true,
      content: {
        'application/json': {
          schema: body,
        },
      },
    }
  }

  if (isSimpleZodOpenApiRequestBodyObject(body)) {
    const { schema, description, required = true, ...rest } = body
    return {
      required,
      description,
      content: {
        'application/json': {
          schema,
          ...rest,
        },
      },
    }
  }

  if (isZodOpenApiRequestBodyObject(body)) {
    return {
      required: true,
      ...body,
    }
  }

  return undefined
}
