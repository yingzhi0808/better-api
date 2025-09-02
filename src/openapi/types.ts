import type { StatusCode } from 'hono/utils/http-status'
import type { ZodArray, ZodFile, ZodObject, ZodType } from 'zod'
import type {
  ZodOpenApiMediaTypeObject as _ZodOpenApiMediaTypeObject,
  ZodOpenApiRequestBodyObject as _ZodOpenApiRequestBodyObject,
  ZodOpenApiResponseObject as _ZodOpenApiResponseObject,
} from 'zod-openapi'

export interface ZodOpenApiMediaTypeObject<T extends ZodType = ZodType>
  extends _ZodOpenApiMediaTypeObject {
  schema: T
}

export interface ZodOpenApiContentObject<T extends ZodType = ZodType> {
  'application/json'?: ZodOpenApiMediaTypeObject<T>
  [mediatype: string]: ZodOpenApiMediaTypeObject<T> | undefined
}

export interface ZodOpenApiRequestBodyObject<T extends ZodType = ZodType>
  extends _ZodOpenApiRequestBodyObject {
  content: ZodOpenApiContentObject<T>
}

export type SimpleZodOpenApiRequestBodyObject<T extends ZodType = ZodType> = Omit<
  ZodOpenApiRequestBodyObject<T>,
  'content'
> &
  ZodOpenApiMediaTypeObject<T>

export interface ZodOpenApiResponseObject extends Omit<_ZodOpenApiResponseObject, 'description'> {
  description?: string
}

export type SimpleZodOpenApiResponseObject = Omit<ZodOpenApiResponseObject, 'content'> &
  ZodOpenApiMediaTypeObject

export type ZodOpenApiResponsesObject = Partial<Record<StatusCode, ZodOpenApiResponseObject>>

export interface OpenApiRouteConfig {
  path: string
  method: string
  responses?: ZodOpenApiResponsesObject
  params?: ZodObject
  query?: ZodObject
  headers?: ZodObject
  cookies?: ZodObject
  body?: ZodOpenApiRequestBodyObject<ZodType>
  form?: ZodOpenApiRequestBodyObject<ZodObject>
  file?: ZodOpenApiRequestBodyObject<ZodFile>
  files?: ZodOpenApiRequestBodyObject<ZodArray<ZodFile>>
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

export type BodySchema =
  | ZodType
  | SimpleZodOpenApiRequestBodyObject<ZodType>
  | ZodOpenApiRequestBodyObject<ZodType>

export type FormSchema =
  | ZodObject
  | SimpleZodOpenApiRequestBodyObject<ZodObject>
  | ZodOpenApiRequestBodyObject<ZodObject>

export type FileSchema =
  | ZodFile
  | SimpleZodOpenApiRequestBodyObject<ZodFile>
  | ZodOpenApiRequestBodyObject<ZodFile>

export type FilesSchema =
  | ZodArray<ZodFile>
  | SimpleZodOpenApiRequestBodyObject<ZodArray<ZodFile>>
  | ZodOpenApiRequestBodyObject<ZodArray<ZodFile>>

export type RouteResponse = ZodType | SimpleZodOpenApiResponseObject | ZodOpenApiResponseObject

export type RouteResponses = Partial<Record<StatusCode, RouteResponse>>

export type ResponsesSchema = RouteResponse | RouteResponses
