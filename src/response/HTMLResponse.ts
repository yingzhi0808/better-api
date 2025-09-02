import type { StatusCode } from 'hono/utils/http-status'
import type { StatusOrInit } from './types'

export class HTMLResponse<
  const Body extends string,
  const Status extends StatusCode = 200,
> extends Response {
  constructor(body: Body, statusOrInit?: StatusOrInit<Status>) {
    const init = typeof statusOrInit === 'object' ? statusOrInit : { status: statusOrInit }
    const { headers, ...rest } = init

    super(body, {
      headers: {
        ...headers,
        'Content-Type': 'text/html',
      },
      ...rest,
    })
  }
}
