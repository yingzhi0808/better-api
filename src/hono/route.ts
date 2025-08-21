import type z from 'zod'
import type { ZodObject } from 'zod'
import type { Provider } from '@/core/di'
import type { HandlerReturnType, RouteConfig } from '@/hono/api'
import type { HttpMethod } from '@/types/common'
import type { ResponsesDefinition } from '@/types/response'
import type { Context as BetterContext } from '../core/context'

export function route<
  Responses extends ResponsesDefinition = undefined,
  Params extends ZodObject | undefined = undefined,
  Query extends ZodObject | undefined = undefined,
  Headers extends ZodObject | undefined = undefined,
  Cookies extends ZodObject | undefined = undefined,
  Body extends z.ZodTypeAny | undefined = undefined,
  Form extends z.ZodTypeAny | undefined = undefined,
  File extends z.ZodTypeAny | undefined = undefined,
  Files extends z.ZodTypeAny | undefined = undefined,
  Dependencies extends
    | Record<string, Provider<unknown>>
    | undefined = undefined,
>(
  def: RouteConfig<
    Responses,
    Params,
    Query,
    Headers,
    Cookies,
    Body,
    Form,
    File,
    Files,
    Dependencies
  >,
) {
  return def
}

export type RouteDefinition<
  Response extends Response = undefined,
  Params extends ZodObject | undefined = undefined,
  Query extends ZodObject | undefined = undefined,
  Headers extends ZodObject | undefined = undefined,
  Cookies extends ZodObject | undefined = undefined,
  Body extends z.ZodTypeAny | undefined = undefined,
  Form extends z.ZodTypeAny | undefined = undefined,
  File extends z.ZodTypeAny | undefined = undefined,
  Files extends z.ZodTypeAny | undefined = undefined,
  Dependencies extends
    | Record<string, Provider<unknown>>
    | undefined = undefined,
> = {
  method: HttpMethod
  path: string
  handler: (
    ctx: BetterContext<
      Response,
      Params,
      Query,
      Headers,
      Cookies,
      Body,
      Form,
      File,
      Files,
      Dependencies
    >,
  ) => HandlerReturnType<Response> | Promise<HandlerReturnType<Response>>
  schema?: RouteConfig<
    Response,
    Params,
    Query,
    Headers,
    Cookies,
    Body,
    Form,
    File,
    Files,
    Dependencies
  >
}

export function defineRoute<
  Response extends Response = undefined,
  Params extends ZodObject | undefined = undefined,
  Query extends ZodObject | undefined = undefined,
  Headers extends ZodObject | undefined = undefined,
  Cookies extends ZodObject | undefined = undefined,
  Body extends z.ZodTypeAny | undefined = undefined,
  Form extends z.ZodTypeAny | undefined = undefined,
  File extends z.ZodTypeAny | undefined = undefined,
  Files extends z.ZodTypeAny | undefined = undefined,
  Dependencies extends
    | Record<string, Provider<unknown>>
    | undefined = undefined,
>(
  def: RouteDefinition<
    Response,
    Params,
    Query,
    Headers,
    Cookies,
    Body,
    Form,
    File,
    Files,
    Dependencies
  >,
) {
  return def
}
