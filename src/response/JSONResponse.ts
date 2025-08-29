import type { StatusCode } from 'hono/utils/http-status'
import type { StatusOrInit } from './types'

export class JSONResponse<
  const Body,
  const Status extends StatusCode = 200,
> extends Response {
  constructor(body: Body, statusOrInit?: StatusOrInit<Status>) {
    const init =
      typeof statusOrInit === 'object' ? statusOrInit : { status: statusOrInit }
    const { headers, ...rest } = init

    super(JSON.stringify(body), {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      ...rest,
    })
  }
}
