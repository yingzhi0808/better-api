import type z from 'zod'
import type { ZodObject } from 'zod'
import type { Provider } from '@/core/di'
import type { HandlerReturnType, ResponseSpec, RouteConfig } from '@/hono/api'
import type { HttpMethod } from '@/types/common'
import type { Context as BetterContext } from '../core/context'

export function route<
  ResponseDefinition extends ResponseSpec = undefined,
  ParamsDefinition extends ZodObject | undefined = undefined,
  QueryDefinition extends ZodObject | undefined = undefined,
  HeadersDefinition extends ZodObject | undefined = undefined,
  CookiesDefinition extends ZodObject | undefined = undefined,
  BodyDefinition extends z.ZodTypeAny | undefined = undefined,
  FormDefinition extends z.ZodTypeAny | undefined = undefined,
  FileDefinition extends z.ZodTypeAny | undefined = undefined,
  FilesDefinition extends z.ZodTypeAny | undefined = undefined,
  Dependencies extends
    | Record<string, Provider<unknown>>
    | undefined = undefined,
>(
  def: RouteConfig<
    ResponseDefinition,
    ParamsDefinition,
    QueryDefinition,
    HeadersDefinition,
    CookiesDefinition,
    BodyDefinition,
    FormDefinition,
    FileDefinition,
    FilesDefinition,
    Dependencies
  >,
) {
  return def
}

export type RouteDefinition<
  ResponseDefinition extends ResponseSpec = undefined,
  ParamsDefinition extends ZodObject | undefined = undefined,
  QueryDefinition extends ZodObject | undefined = undefined,
  HeadersDefinition extends ZodObject | undefined = undefined,
  CookiesDefinition extends ZodObject | undefined = undefined,
  BodyDefinition extends z.ZodTypeAny | undefined = undefined,
  FormDefinition extends z.ZodTypeAny | undefined = undefined,
  FileDefinition extends z.ZodTypeAny | undefined = undefined,
  FilesDefinition extends z.ZodTypeAny | undefined = undefined,
  Dependencies extends
    | Record<string, Provider<unknown>>
    | undefined = undefined,
> = {
  method: HttpMethod
  path: string
  handler: (
    ctx: BetterContext<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Dependencies
    >,
  ) =>
    | HandlerReturnType<ResponseDefinition>
    | Promise<HandlerReturnType<ResponseDefinition>>
  schema?: RouteConfig<
    ResponseDefinition,
    ParamsDefinition,
    QueryDefinition,
    HeadersDefinition,
    CookiesDefinition,
    BodyDefinition,
    FormDefinition,
    FileDefinition,
    FilesDefinition,
    Dependencies
  >
}

export function defineRoute<
  ResponseDefinition extends ResponseSpec = undefined,
  ParamsDefinition extends ZodObject | undefined = undefined,
  QueryDefinition extends ZodObject | undefined = undefined,
  HeadersDefinition extends ZodObject | undefined = undefined,
  CookiesDefinition extends ZodObject | undefined = undefined,
  BodyDefinition extends z.ZodTypeAny | undefined = undefined,
  FormDefinition extends z.ZodTypeAny | undefined = undefined,
  FileDefinition extends z.ZodTypeAny | undefined = undefined,
  FilesDefinition extends z.ZodTypeAny | undefined = undefined,
  Dependencies extends
    | Record<string, Provider<unknown>>
    | undefined = undefined,
>(
  def: RouteDefinition<
    ResponseDefinition,
    ParamsDefinition,
    QueryDefinition,
    HeadersDefinition,
    CookiesDefinition,
    BodyDefinition,
    FormDefinition,
    FileDefinition,
    FilesDefinition,
    Dependencies
  >,
) {
  return def
}
