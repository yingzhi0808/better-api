import type { StatusCode } from 'hono/utils/http-status'
import type { ZodOpenApiRequestBodyObject } from 'zod-openapi'
import { isZodType } from '@/utils/zod'
import type {
  BodySchema,
  FileSchema,
  FilesSchema,
  FormSchema,
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
      const status = Number(statusCode) as StatusCode

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

export function normalizeFormSchema(form: FormSchema) {
  if (isZodType(form)) {
    return {
      required: true,
      content: {
        'multipart/form-data': {
          schema: form,
        },
        'application/x-www-form-urlencoded': {
          schema: form,
        },
      },
    }
  }

  if (isSimpleZodOpenApiRequestBodyObject(form)) {
    const { schema, description, required = true, ...rest } = form
    return {
      required,
      description,
      content: {
        'multipart/form-data': {
          schema,
          ...rest,
        },
        'application/x-www-form-urlencoded': {
          schema,
          ...rest,
        },
      },
    }
  }

  if (isZodOpenApiRequestBodyObject(form)) {
    return {
      required: true,
      ...form,
    }
  }

  return undefined
}

export function normalizeFileSchema(file: FileSchema) {
  if (isZodType(file)) {
    return {
      required: true,
      content: {
        'multipart/form-data': {
          schema: file,
        },
      },
    }
  }

  if (isSimpleZodOpenApiRequestBodyObject(file)) {
    const { schema, description, required = true, ...rest } = file
    return {
      required,
      description,
      content: {
        'multipart/form-data': {
          schema,
          ...rest,
        },
      },
    }
  }

  if (isZodOpenApiRequestBodyObject(file)) {
    return {
      required: true,
      ...file,
    }
  }

  return undefined
}

export function normalizeFilesSchema(files: FilesSchema) {
  if (isZodType(files)) {
    return {
      required: true,
      content: {
        'multipart/form-data': {
          schema: files,
        },
      },
    }
  }

  if (isSimpleZodOpenApiRequestBodyObject(files)) {
    const { schema, description, required = true, ...rest } = files
    return {
      required,
      description,
      content: {
        'multipart/form-data': {
          schema,
          ...rest,
        },
      },
    }
  }

  if (isZodOpenApiRequestBodyObject(files)) {
    return {
      required: true,
      ...files,
    }
  }

  return undefined
}
