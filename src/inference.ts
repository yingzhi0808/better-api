import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type z from 'zod'
import type { ZodArray, ZodFile, ZodObject, ZodType } from 'zod'
import type {
  RouteResponses,
  SimpleZodOpenApiResponseObject,
  ZodOpenApiResponseObject,
} from '@/openapi'
import type { BodySchema } from './openapi'

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

export type InferBody<T> = T extends BodySchema
  ? T extends ZodType
    ? z.infer<T>
    : T extends { schema: infer S; required?: boolean }
      ? S extends ZodType
        ? T['required'] extends false
          ? z.infer<S> | undefined
          : z.infer<S>
        : never
      : never
  : never

export type InferForm<T> = T extends ZodObject ? z.infer<T> : never

export type InferFile<T> = T extends ZodFile ? z.infer<T> : never

export type InferFiles<T> = T extends ZodArray<ZodFile> ? z.infer<T> : never

export type InferResponse<Response, Status> = Response extends RouteResponses
  ? Status extends keyof Response
    ? Response[Status] extends ZodType
      ? z.input<Response[Status]>
      : Response[Status] extends SimpleZodOpenApiResponseObject
        ? z.input<Response[Status]['schema']>
        : Response[Status] extends ZodOpenApiResponseObject
          ? Response[Status]['content'] extends {
              'application/json': { schema: infer S }
            }
            ? S extends ZodType
              ? z.input<S>
              : never
            : never
          : never
    : never
  : Response extends ZodType
    ? z.input<Response>
    : Response extends SimpleZodOpenApiResponseObject
      ? Status extends 200
        ? z.input<Response['schema']>
        : never
      : Response extends ZodOpenApiResponseObject
        ? Status extends 200
          ? Response['content'] extends {
              'application/json': { schema: infer S }
            }
            ? S extends ZodType
              ? z.input<S>
              : never
            : never
          : never
        : unknown

export type InferStatus<T> = T extends RouteResponses
  ? keyof T & StatusCode
  : T extends ZodType
    ? 200
    : T extends SimpleZodOpenApiResponseObject
      ? 200
      : T extends ZodOpenApiResponseObject
        ? 200
        : StatusCode

export type InferAllResponses<Response> = Response extends RouteResponses
  ? {
      [Status in keyof Response]: Response[Status] extends ZodType
        ? z.input<Response[Status]>
        : Response[Status] extends SimpleZodOpenApiResponseObject
          ? z.input<Response[Status]['schema']>
          : Response[Status] extends ZodOpenApiResponseObject
            ? Response[Status]['content'] extends {
                'application/json': { schema: infer S }
              }
              ? S extends ZodType
                ? z.input<S>
                : never
              : never
            : never
    }[keyof Response]
  : Response extends ZodType
    ? z.input<Response>
    : Response extends SimpleZodOpenApiResponseObject
      ? z.input<Response['schema']>
      : Response extends ZodOpenApiResponseObject
        ? Response['content'] extends {
            'application/json': { schema: infer S }
          }
          ? S extends ZodType
            ? z.input<S>
            : never
          : never
        : Response extends undefined
          ? unknown
          : never
