import type { Context as HonoCtx } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodType } from 'zod'
import type { Provider } from '@/core/di'
import { HtmlResponse, JsonResponse, TextResponse } from '@/core/response'
import type { Provided } from '@/hono/api'
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
} from '@/types/infer'
import type { BetterApiResponses } from '@/types/response'
import type { StatusOrInit } from './response'

export class Context<
  Responses,
  Params,
  Query,
  Headers,
  Cookies,
  Body,
  Form,
  File,
  Files,
  Dependencies extends Record<string, Provider<unknown>> | undefined,
> {
  constructor(
    public readonly hono: HonoCtx,
    public readonly params: InferParams<Params>,
    public readonly query: InferQuery<Query>,
    public readonly headers: InferHeaders<Headers>,
    public readonly cookies: InferCookies<Cookies>,
    public readonly body: InferBody<Body>,
    public readonly form: InferForm<Form>,
    public readonly file: InferFile<File>,
    public readonly files: InferFiles<Files>,
    public readonly dependencies: Provided<Dependencies>,
  ) {}

  json<
    Data extends InferResponse<Responses, Status>,
    const Status extends 200 = 200,
  >(data: Data): JsonResponse<Data, Status>
  json<
    Data extends InferResponse<Responses, Status>,
    Status extends InferStatus<Responses>,
  >(data: Data, status: Status): JsonResponse<Data, Status>
  json<
    Data extends InferResponse<Responses, Status>,
    Status extends InferStatus<Responses>,
  >(data: Data, status?: Status) {
    return new JsonResponse(data, status)
  }

  html<
    const Data extends string,
    const Status extends Responses extends BetterApiResponses
      ? keyof Responses & StatusCode
      : Responses extends ZodType
        ? 200
        : Responses extends undefined
          ? StatusCode
          : never,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new HtmlResponse(data, statusOrInit)
  }

  text<
    const Data extends string,
    const Status extends Responses extends BetterApiResponses
      ? keyof Responses & StatusCode
      : Responses extends ZodType
        ? 200
        : Responses extends undefined
          ? StatusCode
          : never,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new TextResponse(data, statusOrInit)
  }
}
