import {
  type ErrorHandler,
  type Handler,
  Hono,
  type Context as HonoContext,
} from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { HTTPResponseError } from 'hono/types'
import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodArray, ZodFile, ZodObject, ZodType } from 'zod'
import type { CreateDocumentOptions, ZodOpenApiObject } from 'zod-openapi'
import { Context } from '@/core/context'
import {
  type Provider,
  type ProviderContext,
  resolveProvider,
  runWithRequestScope,
} from '@/core/di'
import { registerOpenApiRoute } from '@/core/openapi'
import { JSONResponse } from '@/core/response'
import type { HttpMethod } from '@/types/common'
import type { ErrorHandlerMap } from '@/types/error'
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
  BetterApiResponse,
  ResponsesDefinition,
  ZodOpenApiResponsesObject,
} from '@/types/response'
import type { ValidationErrors } from '@/types/zod'
import { normalizeZodOpenApiResponses } from '@/utils/response'
import { isZodType, mergeZodObjects } from '@/utils/zod'

export type HandlerResponse<Responses> =
  | Response
  | InferAllResponses<Responses>
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

export interface BetterAPIOptions<
  GlobalParams extends ZodObject,
  GlobalQuery extends ZodObject,
  GlobalHeaders extends ZodObject,
  GlobalCookies extends ZodObject,
> {
  openapi?: Partial<Omit<ZodOpenApiObject, 'paths'>>
  createDocumentOptions?: CreateDocumentOptions
  globalRequestParams?: {
    params?: GlobalParams
    query?: GlobalQuery
    headers?: GlobalHeaders
    cookies?: GlobalCookies
  }
  globalResponses?: Partial<Record<StatusCode, BetterApiResponse>>
}

export let globalOpenApiOptions: BetterAPIOptions<
  ZodObject,
  ZodObject,
  ZodObject,
  ZodObject
> = {}

const errorHandler = (err: Error | HTTPResponseError, c: HonoContext) => {
  if ('getResponse' in err) {
    const res = err.getResponse()
    return c.newResponse(res.body, res)
  }
  console.error(err)
  return c.text('Internal Server Error', 500)
}

export class BetterAPI<
  GlobalParams extends ZodObject,
  GlobalQuery extends ZodObject,
  GlobalHeaders extends ZodObject,
  GlobalCookies extends ZodObject,
> {
  private instance = new Hono()
  private errorHandlers: ErrorHandlerMap = new Map()

  constructor(
    options?: BetterAPIOptions<
      GlobalParams,
      GlobalQuery,
      GlobalHeaders,
      GlobalCookies
    >,
  ) {
    if (options) {
      globalOpenApiOptions = options
    }

    this.setupErrorHandler()
  }

  getInstance() {
    return this.instance
  }

  use(...args: Parameters<Hono['use']>) {
    const u = this.instance.use.bind(this.instance)
    u(...args)
  }

  /**
   * 注册自定义错误处理器
   * @param errorType 错误构造函数
   * @param handler 错误处理器函数
   */
  registerErrorHandler<T extends Error>(
    errorType: new (...args: unknown[]) => T,
    handler: ErrorHandler,
  ) {
    this.errorHandlers.set(errorType, handler)
  }

  /**
   * 查找匹配的错误处理器
   * @param error 错误实例
   * @returns 匹配的错误处理器和优先级
   */
  private findErrorHandler(error: Error) {
    for (const [errorType, handler] of this.errorHandlers) {
      if (error instanceof errorType) {
        return handler
      }
    }

    return null
  }

  /**
   * 设置自定义错误处理中间件
   */
  private setupErrorHandler() {
    this.instance.onError((error, c) => {
      const handler = this.findErrorHandler(error)
      if (handler) {
        return handler(error, c)
      }

      return errorHandler(error, c)
    })
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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

    const globalRequestParams = globalOpenApiOptions.globalRequestParams

    const mergedParams = mergeZodObjects(
      globalRequestParams?.params,
      options?.params,
    )

    const mergedQuery = mergeZodObjects(
      globalRequestParams?.query,
      options?.query,
    )

    const mergedHeaders = mergeZodObjects(
      globalRequestParams?.headers,
      options?.headers,
    )

    const mergedCookies = mergeZodObjects(
      globalRequestParams?.cookies,
      options?.cookies,
    )

    registerOpenApiRoute({
      path,
      method,
      responses,
      params: mergedParams,
      query: mergedQuery,
      headers: mergedHeaders,
      cookies: mergedCookies,
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

    const wrapper: Handler = (c) => {
      return runWithRequestScope(async () => {
        const validationErrors: ValidationErrors = {}

        const rawParams = c.req.param()
        let typedParams: Record<string, string> | Record<string, unknown> =
          rawParams

        if (mergedParams) {
          const { success, data, error } =
            await mergedParams.safeParseAsync(rawParams)
          if (success) {
            typedParams = data
          } else {
            validationErrors.params = error.issues
          }
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

        if (mergedQuery) {
          const { success, data, error } =
            await mergedQuery.safeParseAsync(rawQuery)

          if (success) {
            typedQuery = data
          } else {
            validationErrors.query = error.issues
          }
        }

        const rawHeaders = c.req.header()
        let typedHeaders:
          | Record<RequestHeader, string>
          | Record<string, unknown> = rawHeaders

        if (mergedHeaders) {
          const { success, data, error } =
            await mergedHeaders.safeParseAsync(rawHeaders)
          if (success) {
            typedHeaders = data
          } else {
            validationErrors.headers = error.issues
          }
        }

        const rawCookies = getCookie(c)
        let typedCookies: Cookie | Record<string, unknown> = rawCookies

        if (mergedCookies) {
          const { success, data, error } =
            await mergedCookies.safeParseAsync(rawCookies)
          if (success) {
            typedCookies = data
          } else {
            validationErrors.cookies = error.issues
          }
        }

        let typedBody: unknown | undefined

        if (options?.body) {
          const rawBody = await c.req.json()
          const { success, data, error } =
            await options.body.safeParseAsync(rawBody)
          if (success) {
            typedBody = data
          } else {
            validationErrors.body = error.issues
          }
        }

        let typedForm: unknown | undefined

        if (options?.form) {
          const rawForm = await c.req.parseBody({ all: true })
          const { success, data, error } =
            await options.form.safeParseAsync(rawForm)
          if (success) {
            typedForm = data
          } else {
            validationErrors.form = error.issues
          }
        }

        let typedFile: unknown | undefined

        if (options?.file) {
          const rawForm = await c.req.parseBody({ all: true })
          const rawFile = rawForm.file
          const { success, data, error } =
            await options.file.safeParseAsync(rawFile)
          if (success) {
            typedFile = data
          } else {
            validationErrors.file = error.issues
          }
        }

        let typedFiles: unknown | undefined

        if (options?.files) {
          const rawForm = await c.req.parseBody({ all: true })
          const rawFiles = Array.isArray(rawForm.files)
            ? rawForm.files
            : [rawForm.files]
          const { success, data, error } =
            await options.files.safeParseAsync(rawFiles)
          if (success) {
            typedFiles = data
          } else {
            validationErrors.files = error.issues
          }
        }

        if (Object.keys(validationErrors).length > 0) {
          throw new HTTPException(400, {
            res: new JSONResponse(validationErrors, 400),
          })
        }

        // dependencies
        let depsObject: Provided<Dependencies> =
          undefined as Provided<Dependencies>
        if (options?.dependencies) {
          const makeCtx = (hono: HonoContext): ProviderContext => {
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

        const context = new Context(
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
            result instanceof JSONResponse || !(result instanceof Response)

          if (shouldValidate) {
            const responseData =
              result instanceof JSONResponse
                ? await result.clone().json()
                : result
            const statusCode =
              result instanceof JSONResponse
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
                return new JSONResponse(data, statusCode)
              }

              throw new HTTPException(500, {
                cause: error,
                message: 'Internal Server Error',
              })
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
        Params & GlobalParams,
        Query & GlobalQuery,
        Headers & GlobalHeaders,
        Cookies & GlobalCookies,
        Body,
        Form,
        File,
        Files,
        Dependencies
      >,
    ) => HandlerResponse<Responses>,
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
