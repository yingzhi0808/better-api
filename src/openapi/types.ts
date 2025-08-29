import type { ZodArray, ZodFile, ZodObject, ZodType } from 'zod'
import type {
  ZodOpenApiResponseObject as _ZodOpenApiResponseObject,
  ZodOpenApiResponsesObject as _ZodOpenApiResponsesObject,
  ZodOpenApiMediaTypeObject,
  ZodOpenApiRequestBodyObject,
} from 'zod-openapi'

export interface OpenApiRouteConfig {
  path: string
  method: string
  responses?: ZodOpenApiResponsesObject
  params?: ZodObject
  query?: ZodObject
  headers?: ZodObject
  cookies?: ZodObject
  body?: ZodOpenApiRequestBodyObject
  form?: ZodObject
  file?: ZodFile
  files?: ZodArray<ZodFile>
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
}

export interface GlobalRequestParams {
  params?: ZodObject
  query?: ZodObject
  headers?: ZodObject
  cookies?: ZodObject
}

/** 覆盖 zod-openapi的ZodOpenApiResponseObject，将description设置为可选，我们会提供一个默认值 */
export interface ZodOpenApiResponseObject
  extends Omit<_ZodOpenApiResponseObject, 'description'> {
  description?: string
}

export type SimpleZodOpenApiResponseObject = Omit<
  ZodOpenApiResponseObject,
  'content'
> &
  ZodOpenApiMediaTypeObject

/**
 * 覆盖 zod-openapi的ZodOpenApiResponsesObject，移除ReferenceObject，
 * 我们不支持$ref，所以不需要ReferenceObject
 */
export interface ZodOpenApiResponsesObject {
  [statuscode: `${1 | 2 | 3 | 4 | 5}${string}`]: ZodOpenApiResponseObject
  [key: `x-${string}`]: unknown
}

export interface RouteResponses {
  [statuscode: `${1 | 2 | 3 | 4 | 5}${string}`]: RouteResponse
  [key: `x-${string}`]: unknown
}

export type RouteResponse =
  | ZodType
  | SimpleZodOpenApiResponseObject
  | ZodOpenApiResponseObject

export type ResponsesSchema = RouteResponse | RouteResponses

export type SimpleZodOpenApiRequestBodyObject = Omit<
  ZodOpenApiRequestBodyObject,
  'content'
> &
  ZodOpenApiMediaTypeObject

export type BodySchema =
  | ZodType
  | SimpleZodOpenApiRequestBodyObject
  | ZodOpenApiRequestBodyObject
