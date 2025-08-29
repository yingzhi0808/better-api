import type { Context as HonoContext } from 'hono'
import type { Provided } from '@/BetterAPI'
import type { Provider } from '@/di'
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
} from '@/inference'
import type { StatusOrInit } from '@/response'
import { HTMLResponse, JSONResponse, TextResponse } from '@/response'

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
    public readonly hono: HonoContext,
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
  >(data: Data): JSONResponse<Data, Status>
  json<
    Data extends InferResponse<Responses, Status>,
    const Status extends InferStatus<Responses>,
  >(data: Data, statusOrInit: StatusOrInit<Status>): JSONResponse<Data, Status>
  json<
    Data extends InferResponse<Responses, Status>,
    const Status extends InferStatus<Responses>,
  >(data: Data, statusOrInit?: StatusOrInit<Status>) {
    return new JSONResponse(data, statusOrInit)
  }

  html<Data extends string, const Status extends InferStatus<Responses>>(
    data: Data,
    statusOrInit?: StatusOrInit<Status>,
  ) {
    return new HTMLResponse(data, statusOrInit)
  }

  text<Data extends string, const Status extends InferStatus<Responses>>(
    data: Data,
    statusOrInit?: StatusOrInit<Status>,
  ) {
    return new TextResponse(data, statusOrInit)
  }
}
