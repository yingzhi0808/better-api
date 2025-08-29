import http from 'node:http'
import { type Handler, Hono, type Context as HonoContext } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodObject } from 'zod'
import { z } from 'zod'
import type {
  CreateDocumentOptions,
  ZodOpenApiObject,
  ZodOpenApiRequestBodyObject,
} from 'zod-openapi'
import { Context } from '@/context'
import {
  type Provider,
  type ProviderContext,
  resolveProvider,
  runWithRequestScope,
} from '@/di'
import type { ErrorHandler, ValidationErrors } from '@/error'
import { RequestValidationError, ResponseValidationError } from '@/error'
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
} from '@/inference'
import type {
  BodySchema,
  FileSchema,
  FilesSchema,
  FormSchema,
  ResponsesSchema,
  RouteResponse,
  ZodOpenApiResponsesObject,
} from '@/openapi'
import {
  normalizeBodySchema,
  normalizeFileSchema,
  normalizeFilesSchema,
  normalizeFormSchema,
  normalizeResponsesSchema,
  registerOpenApiRoute,
} from '@/openapi'
import { JSONResponse } from '@/response'
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
  globalResponses?: Partial<Record<StatusCode, RouteResponse>>
}

export let globalOpenApiOptions: BetterAPIOptions<
  ZodObject,
  ZodObject,
  ZodObject,
  ZodObject
> = {}

export class BetterAPI<
  GlobalParams extends ZodObject,
  GlobalQuery extends ZodObject,
  GlobalHeaders extends ZodObject,
  GlobalCookies extends ZodObject,
> {
  private instance = new Hono()
  private errorHandlers = new Map()

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
      this.setDefaultGlobalResponses(options)
    }

    this.setupErrorHandler()
    this.registerDefaultErrorHandlers()
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
    // biome-ignore lint/suspicious/noExplicitAny: 错误构造函数参数类型未知，使用 any[] 保持灵活性以支持各种错误类型
    errorType: new (...args: any[]) => T,
    handler: ErrorHandler<T>,
  ) {
    this.errorHandlers.set(errorType, handler)
  }

  /**
   * 计算类的继承深度
   * @param ctor 构造函数
   * @returns 继承深度（数字越大表示越具体的子类）
   */
  private getInheritanceDepth(ctor: new (...args: unknown[]) => unknown) {
    let depth = 0
    let current = ctor

    while (current && current !== Error) {
      depth++
      current = Object.getPrototypeOf(current)
    }

    return depth
  }

  /**
   * 查找匹配的错误处理器
   * @param error 错误实例
   * @returns 匹配的错误处理器
   */
  private findErrorHandler(error: Error) {
    let bestMatch: ErrorHandler<Error> | null = null
    let maxDepth = -1

    for (const [errorType, handler] of this.errorHandlers) {
      if (error instanceof errorType) {
        const depth = this.getInheritanceDepth(errorType)
        if (depth > maxDepth) {
          maxDepth = depth
          bestMatch = handler
        }
      }
    }

    return bestMatch
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

      console.error(error)
      return c.json({ message: 'Internal Server Error' }, 500)
    })
  }

  /**
   * 注册默认错误处理器
   */
  private registerDefaultErrorHandlers() {
    this.registerErrorHandler(HTTPException, (error, c) => {
      const res = error.getResponse()
      return c.newResponse(res.body, res)
    })

    this.registerErrorHandler(ResponseValidationError, (error, c) => {
      console.error(error)
      return c.json({ message: http.STATUS_CODES[error.status] }, error.status)
    })
  }

  /**
   * 设置默认全局响应
   */
  private setDefaultGlobalResponses(
    options: BetterAPIOptions<
      GlobalParams,
      GlobalQuery,
      GlobalHeaders,
      GlobalCookies
    >,
  ) {
    if (!options.globalResponses) {
      options.globalResponses = {}
    }

    // 设置默认的 400 Bad Request 响应
    if (!options.globalResponses[400]) {
      options.globalResponses[400] = z.object({
        message: z.string().default('Request validation failed'),
        error: z.array(
          z.object({
            in: z.string(),
            code: z.string(),
            path: z.array(z.string()),
            input: z.unknown(),
            message: z.string(),
          }),
        ),
      })
    }

    // 设置默认的 500 Internal Server Error 响应
    if (!options.globalResponses[500]) {
      options.globalResponses[500] = z.object({
        message: z.string().default('Internal Server Error'),
      })
    }
  }

  private registerRoute<
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    method: string,
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
    const responses =
      options?.responses && normalizeResponsesSchema(options?.responses)
    const body = options?.body && normalizeBodySchema(options.body)
    const form = options?.form && normalizeFormSchema(options.form)
    const file = options?.file && normalizeFileSchema(options.file)
    const files = options?.files && normalizeFilesSchema(options.files)

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
      body,
      form,
      file,
      files,
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
          const { success, data, error } = await mergedParams.safeParseAsync(
            rawParams,
            { reportInput: true },
          )
          if (success) {
            typedParams = data
          } else {
            validationErrors.params = error
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
          const { success, data, error } = await mergedQuery.safeParseAsync(
            rawQuery,
            { reportInput: true },
          )

          if (success) {
            typedQuery = data
          } else {
            validationErrors.query = error
          }
        }

        const rawHeaders = c.req.header()
        let typedHeaders:
          | Record<RequestHeader, string>
          | Record<string, unknown> = rawHeaders

        if (mergedHeaders) {
          const { success, data, error } = await mergedHeaders.safeParseAsync(
            rawHeaders,
            { reportInput: true },
          )
          if (success) {
            typedHeaders = data
          } else {
            validationErrors.headers = error
          }
        }

        const rawCookies = getCookie(c)
        let typedCookies: Cookie | Record<string, unknown> = rawCookies

        if (mergedCookies) {
          const { success, data, error } = await mergedCookies.safeParseAsync(
            rawCookies,
            { reportInput: true },
          )
          if (success) {
            typedCookies = data
          } else {
            validationErrors.cookies = error
          }
        }

        let typedBody: unknown | undefined

        if (body) {
          const validationSchema = getRequestBodyValidationSchema(body, [
            'application/json',
          ])
          const bodyLength = Number(
            c.req.header('content-length') ??
              (await c.req.arrayBuffer()).byteLength,
          )
          if (validationSchema && (bodyLength > 0 || body.required)) {
            const rawBody = await c.req.json()
            const { success, data, error } =
              await validationSchema.safeParseAsync(rawBody, {
                reportInput: true,
              })
            if (success) {
              typedBody = data
            } else {
              validationErrors.body = error
            }
          }
        }

        let typedForm: unknown | undefined

        if (form) {
          const validationSchema = getRequestBodyValidationSchema(form, [
            'multipart/form-data',
            'application/x-www-form-urlencoded',
          ])
          const bodyLength = Number(
            c.req.header('content-length') ??
              (await c.req.arrayBuffer()).byteLength,
          )
          if (validationSchema && (bodyLength > 0 || form.required)) {
            const rawForm = await c.req.parseBody({ all: true })
            const { success, data, error } =
              await validationSchema.safeParseAsync(rawForm, {
                reportInput: true,
              })
            if (success) {
              typedForm = data
            } else {
              validationErrors.form = error
            }
          }
        }

        let typedFile: unknown | undefined

        if (file) {
          const validationSchema = getRequestBodyValidationSchema(file, [
            'multipart/form-data',
          ])
          const bodyLength = Number(
            c.req.header('content-length') ??
              (await c.req.arrayBuffer()).byteLength,
          )
          if (validationSchema && (bodyLength > 0 || file.required)) {
            const rawForm = await c.req.parseBody({ all: true })
            const rawFile = rawForm.file
            const { success, data, error } =
              await validationSchema.safeParseAsync(rawFile, {
                reportInput: true,
              })
            if (success) {
              typedFile = data
            } else {
              validationErrors.file = error
            }
          }
        }

        let typedFiles: unknown | undefined

        if (files) {
          const validationSchema = getRequestBodyValidationSchema(files, [
            'multipart/form-data',
          ])
          const bodyLength = Number(
            c.req.header('content-length') ??
              (await c.req.arrayBuffer()).byteLength,
          )
          if (validationSchema && (bodyLength > 0 || files.required)) {
            const rawForm = await c.req.parseBody({ all: true })
            const rawFiles = Array.isArray(rawForm.files)
              ? rawForm.files
              : [rawForm.files]
            const { success, data, error } =
              await validationSchema.safeParseAsync(rawFiles, {
                reportInput: true,
              })
            if (success) {
              typedFiles = data
            } else {
              validationErrors.files = error
            }
          }
        }

        if (Object.keys(validationErrors).length > 0) {
          throw new RequestValidationError(400, validationErrors)
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

            const validationSchema = getResponsesValidationSchema(
              responses,
              String(statusCode) as `${1 | 2 | 3 | 4 | 5}${string}`,
            )

            if (validationSchema) {
              const { success, data, error } =
                await validationSchema.safeParseAsync(responseData, {
                  reportInput: true,
                })
              if (success) {
                return new JSONResponse(data, statusCode)
              }

              throw new ResponseValidationError(500, { response: error })
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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
    Responses extends ResponsesSchema,
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
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

function getResponsesValidationSchema(
  responses: ZodOpenApiResponsesObject,
  statusCode: `${1 | 2 | 3 | 4 | 5}${string}`,
) {
  const schema = responses[statusCode]?.content?.['application/json']?.schema
  return isZodType(schema) ? schema : null
}

function getRequestBodyValidationSchema(
  requestBody: ZodOpenApiRequestBodyObject,
  mediaTypes: string[],
) {
  for (const mediaType of mediaTypes) {
    const schema = requestBody?.content?.[mediaType]?.schema
    if (isZodType(schema)) {
      return schema
    }
  }
  return null
}
