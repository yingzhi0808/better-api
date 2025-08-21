import { type Handler, Hono, type Context as HonoCtx } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodArray, ZodFile, ZodObject, ZodType } from 'zod'
import { Context } from '@/core/context'
import {
  type Provider,
  type ProviderContext,
  resolveProvider,
  runWithRequestScope,
} from '@/core/di'
import { addRouteSchema } from '@/core/openapi'
import { JsonResponse } from '@/core/response'
import type { HttpMethod } from '@/types/common'
import type {
  InferAllResponses,
  InferBody,
  InferCookies,
  InferFile,
  InferFiles,
  InferForm,
  InferHeaders,
  InferParams,
  InferQuery,
} from '@/types/infer'
import type {
  ResponsesDefinition,
  ZodOpenApiResponsesObject,
} from '@/types/response'
import { normalizeZodOpenApiResponses } from '@/utils/response'
import { isZodType } from '@/utils/zod'

export type HandlerReturnType<Responses> =
  | InferAllResponses<Responses>
  | Response
  | Promise<InferAllResponses<Responses> | Response>

export type Provided<
  Dependencies extends Record<string, Provider<unknown>> | undefined,
> = Dependencies extends Record<string, Provider<unknown>>
  ? { [K in keyof Dependencies]: Promise<Awaited<ReturnType<Dependencies[K]>>> }
  : undefined

export interface RouteConfig<
  Responses,
  Params,
  Query,
  Headers,
  Cookies,
  Body,
  Form,
  File,
  Files,
  Dependencies,
> {
  responses?: Responses
  params?: Params
  query?: Query
  headers?: Headers
  cookies?: Cookies
  body?: Body
  form?: Form
  file?: File
  files?: Files
  dependencies?: Dependencies
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
}

export class BetterAPI {
  private instance = new Hono()

  getInstance() {
    return this.instance
  }

  use(...args: Parameters<Hono['use']>) {
    const u = this.instance.use.bind(this.instance)
    u(...args)
  }

  private registerRoute<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    method: HttpMethod,
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    const responses = normalizeZodOpenApiResponses(options?.responses ?? {})

    addRouteSchema({
      path,
      method,
      responses,
      params: options?.params,
      query: options?.query,
      headers: options?.headers,
      cookies: options?.cookies,
      body: options?.body,
      form: options?.form,
      file: options?.file,
      files: options?.files,
      summary: options?.summary,
      description: options?.description,
      tags: options?.tags,
      operationId: options?.operationId,
      deprecated: options?.deprecated,
    })

    const wrapper: Handler = async (c) => {
      return runWithRequestScope(async () => {
        const rawParams = c.req.param()
        let typedParams: Record<string, string> | Record<string, unknown> =
          rawParams

        if (options?.params) {
          const { success, data, error } =
            await options.params.safeParseAsync(rawParams)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedParams = data
        }

        const rawQueries = c.req.queries()
        const rawQuery = Object.fromEntries(
          Object.entries(rawQueries).map(([key, values]) => [
            key,
            Array.isArray(values) && values.length === 1 ? values[0] : values,
          ]),
        )
        let typedQuery:
          | Record<string, string | string[]>
          | Record<string, unknown> = rawQuery

        if (options?.query) {
          const { success, data, error } =
            await options.query.safeParseAsync(rawQuery)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedQuery = data
        }

        const rawHeaders = c.req.header()
        let typedHeaders:
          | Record<RequestHeader, string>
          | Record<string, unknown> = rawHeaders

        if (options?.headers) {
          const { success, data, error } =
            await options.headers.safeParseAsync(rawHeaders)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedHeaders = {
            ...rawHeaders,
            ...data,
          }
        }

        const rawCookies = getCookie(c)
        let typedCookies: Cookie | Record<string, unknown> = rawCookies

        if (options?.cookies) {
          const { success, data, error } =
            await options.cookies.safeParseAsync(rawCookies)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedCookies = data
        }

        let typedBody: unknown | undefined

        if (options?.body) {
          const rawBody = await c.req.json()
          const { success, data, error } =
            await options.body.safeParseAsync(rawBody)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedBody = data
        }

        let typedForm: unknown | undefined

        if (options?.form) {
          const rawForm = await c.req.parseBody({ all: true })
          const { success, data, error } =
            await options.form.safeParseAsync(rawForm)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedForm = data
        }

        let typedFile: unknown | undefined

        if (options?.file) {
          const rawForm = await c.req.parseBody({ all: true })
          const rawFile = rawForm.file
          const { success, data, error } =
            await options.file.safeParseAsync(rawFile)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedFile = data
        }

        let typedFiles: unknown | undefined

        if (options?.files) {
          const rawForm = await c.req.parseBody({ all: true })
          const rawFiles = Array.isArray(rawForm.files)
            ? rawForm.files
            : [rawForm.files]
          const { success, data, error } =
            await options.files.safeParseAsync(rawFiles)
          if (!success) {
            throw new HTTPException(400, { cause: error })
          }
          typedFiles = data
        }

        // dependencies
        let depsObject: Provided<Dependencies> =
          undefined as Provided<Dependencies>
        if (options?.dependencies) {
          const makeCtx = (hono: HonoCtx): ProviderContext => {
            const ctx: ProviderContext = {
              hono,
              get: <T>(prov: Provider<T>) => resolveProvider(prov, ctx),
            }
            return ctx
          }
          const providerCtx = makeCtx(c)
          const entries = Object.entries(
            options.dependencies as Record<string, Provider<unknown>>,
          ).map(([k, p]) => [k, resolveProvider(p, providerCtx)] as const)
          depsObject = Object.fromEntries(entries) as Provided<Dependencies>
        }

        const context = new Context<
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
        >(
          c,
          typedParams as InferParams<Params>,
          typedQuery as InferQuery<Query>,
          typedHeaders as InferHeaders<Headers>,
          typedCookies as InferCookies<Cookies>,
          typedBody as InferBody<Body>,
          typedForm as InferForm<Form>,
          typedFile as InferFile<File>,
          typedFiles as InferFiles<Files>,
          depsObject,
        )

        const result = await handler(context)

        if (responses) {
          const shouldValidate =
            result instanceof JsonResponse || !(result instanceof Response)

          if (shouldValidate) {
            const responseData =
              result instanceof JsonResponse
                ? await result.clone().json()
                : result
            const statusCode =
              result instanceof JsonResponse
                ? (result.status as StatusCode)
                : 200

            const validationSchema = getValidationSchema(
              responses,
              String(statusCode) as `${1 | 2 | 3 | 4 | 5}${string}`,
            )

            if (validationSchema) {
              const { success, data, error } =
                await validationSchema.safeParseAsync(responseData)
              if (success) {
                return new JsonResponse(data, statusCode)
              }

              throw new HTTPException(500, { cause: error })
            }
          }
        }

        return result
      })
    }

    switch (method) {
      case 'get':
        this.instance.get(path, wrapper)
        break
      case 'post':
        this.instance.post(path, wrapper)
        break
      case 'put':
        this.instance.put(path, wrapper)
        break
      case 'delete':
        this.instance.delete(path, wrapper)
        break
      case 'patch':
        this.instance.patch(path, wrapper)
        break
      case 'options':
        this.instance.options(path, wrapper)
        break
      case 'head':
        this.instance.on('HEAD', path, wrapper)
        break
      case 'trace':
        this.instance.on('TRACE', path, wrapper)
        break
    }
  }

  post<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('post', path, handler, options)
  }

  get<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('get', path, handler, options)
  }

  put<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('put', path, handler, options)
  }

  delete<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('delete', path, handler, options)
  }

  patch<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('patch', path, handler, options)
  }

  options<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('options', path, handler, options)
  }

  head<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('head', path, handler, options)
  }

  trace<
    Responses extends ResponsesDefinition,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends ZodType | undefined = undefined,
    Form extends ZodObject | undefined = undefined,
    File extends ZodFile | undefined = undefined,
    Files extends ZodArray<ZodFile> | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
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
    ) => HandlerReturnType<Responses>,
    options?: RouteConfig<
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
    this.registerRoute('trace', path, handler, options)
  }
}

function getValidationSchema(
  responses: ZodOpenApiResponsesObject,
  statusCode: `${1 | 2 | 3 | 4 | 5}${string}`,
) {
  const schema = responses[statusCode]?.content?.['application/json']?.schema
  return isZodType(schema) ? schema : null
}
