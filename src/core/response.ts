import type { StatusCode } from 'hono/utils/http-status'

export type StatusOrInit<Status extends StatusCode> =
  | Status
  | (ResponseInit & { status?: Status })

export class JsonResponse<
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

export class HtmlResponse<
  const Body extends string,
  const Status extends StatusCode = 200,
> extends Response {
  constructor(body: Body, statusOrInit?: StatusOrInit<Status>) {
    const init =
      typeof statusOrInit === 'object' ? statusOrInit : { status: statusOrInit }
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

export class TextResponse<
  const Body extends string,
  const Status extends StatusCode = 200,
> extends Response {
  constructor(body: Body, statusOrInit?: StatusOrInit<Status>) {
    const init =
      typeof statusOrInit === 'object' ? statusOrInit : { status: statusOrInit }
    const { headers, ...rest } = init

    super(body, {
      headers: {
        ...headers,
        'Content-Type': 'text/plain',
      },
      ...rest,
    })
  }
}
