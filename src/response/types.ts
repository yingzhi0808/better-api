import type { StatusCode } from 'hono/utils/http-status'

export type StatusOrInit<Status extends StatusCode> = Status | (ResponseInit & { status?: Status })
