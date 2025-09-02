import type { Context as HonoContext } from 'hono'
import type { InferResponse, InferStatus } from '@/inference'
import type { StatusOrInit } from '@/response'
import { HTMLResponse, JSONResponse, TextResponse } from '@/response'

export class Context<
  Params,
  Query,
  Headers,
  Cookies,
  Body,
  Form,
  File,
  Files,
  Responses,
  Dependencies,
> {
  constructor(
    public readonly hono: HonoContext,
    public readonly params: Params,
    public readonly query: Query,
    public readonly headers: Headers,
    public readonly cookies: Cookies,
    public readonly body: Body,
    public readonly form: Form,
    public readonly file: File,
    public readonly files: Files,
    public readonly dependencies: Dependencies,
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
