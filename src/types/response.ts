import type { ZodType } from 'zod'
import type {
  ZodOpenApiResponseObject as _ZodOpenApiResponseObject,
  ZodOpenApiResponsesObject as _ZodOpenApiResponsesObject,
  ZodOpenApiMediaTypeObject,
} from 'zod-openapi'

/** 覆盖 zod-openapi的ZodOpenApiResponseObject，将description设置为可选，我们会提供一个默认值 */
export interface ZodOpenApiResponseObject
  extends Omit<_ZodOpenApiResponseObject, 'description'> {
  description?: string
}

/**
 * 覆盖 zod-openapi的ZodOpenApiResponsesObject，移除ReferenceObject，
 * 我们不支持$ref，所以不需要ReferenceObject
 */
export interface ZodOpenApiResponsesObject {
  [statuscode: `${1 | 2 | 3 | 4 | 5}${string}`]: ZodOpenApiResponseObject
  [key: `x-${string}`]: unknown
}

export type SimplifiedZodOpenApiResponseObject = Omit<
  ZodOpenApiResponseObject,
  'content'
> &
  ZodOpenApiMediaTypeObject

export type BetterApiResponse =
  | ZodType
  | SimplifiedZodOpenApiResponseObject
  | ZodOpenApiResponseObject

export interface BetterApiResponses {
  [statuscode: `${1 | 2 | 3 | 4 | 5}${string}`]: BetterApiResponse
  [key: `x-${string}`]: unknown
}

export type ResponsesDefinition = BetterApiResponse | BetterApiResponses
