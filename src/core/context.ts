import type { Context as HonoCtx } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodType } from 'zod'
import type { Provider } from '@/core/di'
import { HtmlResponse, JsonResponse, TextResponse } from '@/core/response'
import type { Provided, StatusResponseMap } from '@/hono/api'
import type {
  InferBody,
  InferCookies,
  InferFile,
  InferFiles,
  InferForm,
  InferHeaders,
  InferParams,
  InferQuery,
  InferResponse,
  InferStatus,
} from '@/types/zod'
import type { StatusOrInit } from './response'

export class Context<
  ResponseDefinition,
  ParamsDefinition,
  QueryDefinition,
  HeadersDefinition,
  CookiesDefinition,
  BodyDefinition,
  FormDefinition,
  FileDefinition,
  FilesDefinition,
  Deps extends Record<string, Provider<unknown>> | undefined,
> {
  constructor(
    public readonly hono: HonoCtx,
    public readonly params: InferParams<ParamsDefinition>,
    public readonly query: InferQuery<QueryDefinition>,
    public readonly headers: InferHeaders<HeadersDefinition>,
    public readonly cookies: InferCookies<CookiesDefinition>,
    public readonly body: InferBody<BodyDefinition>,
    public readonly form: InferForm<FormDefinition>,
    public readonly file: InferFile<FileDefinition>,
    public readonly files: InferFiles<FilesDefinition>,
    public readonly deps: Provided<Deps>,
  ) {}

  json<
    Data extends InferResponse<ResponseDefinition, Status>,
    const Status extends 200 = 200,
  >(data: Data): JsonResponse<Data, Status>
  json<
    Data extends InferResponse<ResponseDefinition, Status>,
    Status extends InferStatus<ResponseDefinition>,
  >(data: Data, status: Status): JsonResponse<Data, Status>
  json<
    Data extends InferResponse<ResponseDefinition, Status>,
    Status extends InferStatus<ResponseDefinition>,
  >(data: Data, status?: Status) {
    return new JsonResponse(data, status)
  }

  html<
    const Data extends string,
    const Status extends ResponseDefinition extends StatusResponseMap
      ? keyof ResponseDefinition & StatusCode
      : ResponseDefinition extends ZodType
        ? 200
        : ResponseDefinition extends undefined
          ? StatusCode
          : never,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new HtmlResponse(data, statusOrInit)
  }

  text<
    const Data extends string,
    const Status extends ResponseDefinition extends StatusResponseMap
      ? keyof ResponseDefinition & StatusCode
      : ResponseDefinition extends ZodType
        ? 200
        : ResponseDefinition extends undefined
          ? StatusCode
          : never,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new TextResponse(data, statusOrInit)
  }
}
