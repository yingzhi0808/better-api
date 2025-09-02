import type { Context as HonoContext } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodType } from 'zod'
import type { ZodOpenApiRequestBodyObject, ZodOpenApiResponsesObject } from '@/openapi'
import { isZodType } from '@/utils/zod'

export function getResponsesValidationSchema(
  responses: ZodOpenApiResponsesObject,
  statusCode: StatusCode,
) {
  const schema = responses[statusCode]?.content?.['application/json']?.schema
  return isZodType(schema) ? schema : null
}

function getRequestBodyValidationSchema<T extends ZodType>(
  requestBody: ZodOpenApiRequestBodyObject<T>,
  mediaTypes: string[],
) {
  for (const mediaType of mediaTypes) {
    const schema = requestBody?.content?.[mediaType]?.schema
    if (isZodType(schema)) {
      return schema
    }
  }
  return null
}

export async function parseRequestBody<T extends ZodType>(
  context: HonoContext,
  contentType: 'json' | 'form' | 'file' | 'files',
  requestBody?: ZodOpenApiRequestBodyObject<T>,
) {
  if (!requestBody) {
    return null
  }

  const mediaTypes =
    contentType === 'json'
      ? ['application/json']
      : contentType === 'form'
        ? ['multipart/form-data', 'application/x-www-form-urlencoded']
        : ['multipart/form-data']
  const validationSchema = getRequestBodyValidationSchema(requestBody, mediaTypes)
  const bodyLength = Number(
    context.req.header('content-length') ?? (await context.req.arrayBuffer()).byteLength,
  )
  if (validationSchema && (bodyLength > 0 || requestBody.required)) {
    let rawBody: unknown

    switch (contentType) {
      case 'json':
        rawBody = await context.req.json()
        break
      case 'form':
        rawBody = await context.req.parseBody({ all: true })
        break
      case 'file':
        {
          const rawForm = await context.req.parseBody({ all: true })
          rawBody = rawForm.file
        }
        break
      case 'files':
        {
          const rawForm = await context.req.parseBody({ all: true })
          rawBody = Array.isArray(rawForm.files) ? rawForm.files : [rawForm.files]
        }
        break
    }

    return validationSchema.safeParseAsync(rawBody, { reportInput: true })
  }

  return null
}
