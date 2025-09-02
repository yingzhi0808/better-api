import type { StatusCode } from 'hono/utils/http-status'
import type { ZodType } from 'zod'
import type {
  ZodOpenApiRequestBodyObject,
  ZodOpenApiResponsesObject,
} from '@/openapi'
import { isZodType } from '@/utils/zod'

export function getResponsesValidationSchema(
  responses: ZodOpenApiResponsesObject,
  statusCode: StatusCode,
) {
  const schema = responses[statusCode]?.content?.['application/json']?.schema
  return isZodType(schema) ? schema : null
}

export function getRequestBodyValidationSchema<T extends ZodType>(
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
