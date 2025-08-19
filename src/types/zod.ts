import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodArray, ZodFile, ZodObject, ZodType, z } from 'zod'
import type { StatusResponseMap } from '@/hono/api'
import type {
  HeaderObject,
  MediaTypeObject,
  ReferenceObject,
  ResponseObject,
} from './openapi'

/** 基于OpenAPI标准的MediaTypeObject，将schema类型替换为ZodType */
export interface ZodMediaTypeObject extends Omit<MediaTypeObject, 'schema'> {
  schema: ZodType
}

/** 基于OpenAPI标准的HeaderObject，将schema类型替换为ZodType */
export interface ZodHeaderObject extends Omit<HeaderObject, 'schema'> {
  schema: ZodType
}

/** 基于OpenAPI标准的ResponseObject，支持完整的OpenAPI字段 */
export interface ZodResponseObject
  extends Omit<ResponseObject, 'content' | 'description' | 'headers'> {
  description?: string
  content: Record<string, ZodMediaTypeObject>
  headers?: Record<string, ZodHeaderObject | ReferenceObject>
}

/**
 * 基于OpenAPI标准的ResponseObject，除了content字段，并添加MediaTypeObject的字段。
 * 这相当于一个简化的response配置，直接包含schema和MediaType的其他属性
 */
export type SimplifiedZodResponseObject = Omit<ZodResponseObject, 'content'> &
  ZodMediaTypeObject

export type InferParams<T> = T extends ZodObject
  ? z.infer<T>
  : Record<string, string>

export type InferQuery<T> = T extends ZodObject
  ? z.infer<T>
  : Record<string, string | string[]>

export type InferHeaders<T> = T extends ZodObject
  ? z.infer<T> & Record<Lowercase<RequestHeader>, string>
  : Record<Lowercase<RequestHeader>, string>

export type InferCookies<T> = T extends ZodObject ? z.infer<T> : Cookie

export type InferBody<T> = T extends ZodType ? z.infer<T> : never

export type InferForm<T> = T extends ZodObject ? z.infer<T> : never

export type InferFile<T> = T extends ZodFile ? z.infer<T> : never

export type InferFiles<T> = T extends ZodArray<ZodFile> ? z.infer<T> : never

// 统一的响应类型推导工具，支持所有响应定义格式
export type InferResponse<ResponseDefinition, Status> =
  ResponseDefinition extends StatusResponseMap
    ? Status extends keyof ResponseDefinition
      ? ResponseDefinition[Status] extends ZodType
        ? z.input<ResponseDefinition[Status]>
        : ResponseDefinition[Status] extends SimplifiedZodResponseObject
          ? z.input<ResponseDefinition[Status]['schema']>
          : ResponseDefinition[Status] extends ZodResponseObject
            ? ResponseDefinition[Status]['content']['application/json'] extends {
                schema: infer S
              }
              ? S extends ZodType
                ? z.input<S>
                : never
              : never
            : never
      : never
    : ResponseDefinition extends ZodType
      ? z.input<ResponseDefinition>
      : ResponseDefinition extends SimplifiedZodResponseObject
        ? Status extends 200
          ? z.input<ResponseDefinition['schema']>
          : never
        : ResponseDefinition extends ZodResponseObject
          ? Status extends 200
            ? ResponseDefinition['content']['application/json'] extends {
                schema: infer S
              }
              ? S extends ZodType
                ? z.input<S>
                : never
              : never
            : never
          : unknown

// 统一的状态码推导工具，支持所有响应定义格式
export type InferStatus<T> = T extends StatusResponseMap
  ? keyof T & StatusCode
  : T extends ZodType
    ? 200
    : T extends SimplifiedZodResponseObject
      ? 200
      : T extends ZodResponseObject
        ? 200
        : StatusCode

// 推导所有可能的响应类型联合，用于 HandlerReturnType
export type InferAllResponses<ResponseDefinition> =
  ResponseDefinition extends StatusResponseMap
    ? {
        [Status in keyof ResponseDefinition]: ResponseDefinition[Status] extends ZodType
          ? z.input<ResponseDefinition[Status]>
          : ResponseDefinition[Status] extends SimplifiedZodResponseObject
            ? z.input<ResponseDefinition[Status]['schema']>
            : ResponseDefinition[Status] extends ZodResponseObject
              ? ResponseDefinition[Status]['content']['application/json'] extends {
                  schema: infer S
                }
                ? S extends ZodType
                  ? z.input<S>
                  : never
                : never
              : never
      }[keyof ResponseDefinition]
    : ResponseDefinition extends ZodType
      ? z.input<ResponseDefinition>
      : ResponseDefinition extends SimplifiedZodResponseObject
        ? z.input<ResponseDefinition['schema']>
        : ResponseDefinition extends ZodResponseObject
          ? ResponseDefinition['content']['application/json'] extends {
              schema: infer S
            }
            ? S extends ZodType
              ? z.input<S>
              : never
            : never
          : ResponseDefinition extends undefined
            ? unknown
            : never
