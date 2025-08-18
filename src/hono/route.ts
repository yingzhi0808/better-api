import type z from 'zod'
import type { ZodObject } from 'zod'
import type { Provider } from '@/core/di'
import type {
  Context as BetterContext,
  HandlerReturnType,
  ResponseSchemaMap,
  RouteOptions,
} from '@/hono/api'
import type { HttpMethod } from '@/types/common'

export function route<
  ResponseSchema extends
    | ResponseSchemaMap
    | z.ZodTypeAny
    | undefined = undefined,
  ParamsSchema extends ZodObject | undefined = undefined,
  QuerySchema extends ZodObject | undefined = undefined,
  HeadersSchema extends ZodObject | undefined = undefined,
  CookiesSchema extends ZodObject | undefined = undefined,
  BodySchema extends z.ZodTypeAny | undefined = undefined,
  FormSchema extends z.ZodTypeAny | undefined = undefined,
  FileSchema extends z.ZodTypeAny | undefined = undefined,
  FilesSchema extends z.ZodTypeAny | undefined = undefined,
  Deps extends Record<string, Provider<unknown>> | undefined = undefined,
>(
  def: RouteOptions<
    ResponseSchema,
    ParamsSchema,
    QuerySchema,
    HeadersSchema,
    CookiesSchema,
    BodySchema,
    FormSchema,
    FileSchema,
    FilesSchema,
    Deps
  >,
) {
  return def
}

export type RouteDefinition<
  ResponseSchema extends
    | ResponseSchemaMap
    | z.ZodTypeAny
    | undefined = undefined,
  ParamsSchema extends ZodObject | undefined = undefined,
  QuerySchema extends ZodObject | undefined = undefined,
  HeadersSchema extends ZodObject | undefined = undefined,
  CookiesSchema extends ZodObject | undefined = undefined,
  BodySchema extends z.ZodTypeAny | undefined = undefined,
  FormSchema extends z.ZodTypeAny | undefined = undefined,
  FileSchema extends z.ZodTypeAny | undefined = undefined,
  FilesSchema extends z.ZodTypeAny | undefined = undefined,
  Deps extends Record<string, Provider<unknown>> | undefined = undefined,
> = {
  method: HttpMethod
  path: string
  handler: (
    ctx: BetterContext<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) =>
    | HandlerReturnType<ResponseSchema>
    | Promise<HandlerReturnType<ResponseSchema>>
  schema?: RouteOptions<
    ResponseSchema,
    ParamsSchema,
    QuerySchema,
    HeadersSchema,
    CookiesSchema,
    BodySchema,
    FormSchema,
    FileSchema,
    FilesSchema,
    Deps
  >
}

export function defineRoute<
  ResponseSchema extends
    | ResponseSchemaMap
    | z.ZodTypeAny
    | undefined = undefined,
  ParamsSchema extends ZodObject | undefined = undefined,
  QuerySchema extends ZodObject | undefined = undefined,
  HeadersSchema extends ZodObject | undefined = undefined,
  CookiesSchema extends ZodObject | undefined = undefined,
  BodySchema extends z.ZodTypeAny | undefined = undefined,
  FormSchema extends z.ZodTypeAny | undefined = undefined,
  FileSchema extends z.ZodTypeAny | undefined = undefined,
  FilesSchema extends z.ZodTypeAny | undefined = undefined,
  Deps extends Record<string, Provider<unknown>> | undefined = undefined,
>(
  def: RouteDefinition<
    ResponseSchema,
    ParamsSchema,
    QuerySchema,
    HeadersSchema,
    CookiesSchema,
    BodySchema,
    FormSchema,
    FileSchema,
    FilesSchema,
    Deps
  >,
) {
  return def
}
