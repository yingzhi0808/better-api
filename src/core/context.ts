import type { Context as HonoCtx } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodType, z } from 'zod'
import type { Provider } from '@/core/di'
import { HtmlResponse, JsonResponse } from '@/core/response'
import type {
  BodyOf,
  CookiesOf,
  FileOf,
  FilesOf,
  FormOf,
  HeadersOf,
  ParamsOf,
  Provided,
  QueryOf,
  ResponseSchemaMap,
  SchemaToResponse,
  StatusOrInit,
} from '@/hono/api'

export class Context<
  ResponseSchema,
  ParamsSchema,
  QuerySchema,
  HeadersSchema,
  CookiesSchema,
  BodySchema,
  FormSchema,
  FileSchema,
  FilesSchema,
  Deps extends Record<string, Provider<unknown>> | undefined,
> {
  constructor(
    public readonly hono: HonoCtx,
    public readonly params: ParamsOf<ParamsSchema>,
    public readonly query: QueryOf<QuerySchema>,
    public readonly headers: HeadersOf<HeadersSchema>,
    public readonly cookies: CookiesOf<CookiesSchema>,
    public readonly body: BodyOf<BodySchema>,
    public readonly form: FormOf<FormSchema>,
    public readonly file: FileOf<FileSchema>,
    public readonly files: FilesOf<FilesSchema>,
    public readonly deps: Provided<Deps>,
  ) {}

  json<
   const Data extends ResponseSchema extends ResponseSchemaMap
      ? SchemaToResponse<ResponseSchema>[Status & StatusCode]
      : ResponseSchema extends ZodType
        ? z.input<ResponseSchema>
        : ResponseSchema extends undefined
          ? unknown
          : never,
    const Status extends ResponseSchema extends ResponseSchemaMap
      ? keyof ResponseSchema & StatusCode
      : ResponseSchema extends ZodType
        ? 200
        : ResponseSchema extends undefined
          ? StatusCode
          : never,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new JsonResponse(data, statusOrInit)
  }

  html<
   const Data extends string,
    const Status extends ResponseSchema extends ResponseSchemaMap
    ? keyof ResponseSchema & StatusCode
    : ResponseSchema extends ZodType
      ? 200
      : ResponseSchema extends undefined
        ? StatusCode
        : never,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new HtmlResponse(data, statusOrInit)
  }
}
