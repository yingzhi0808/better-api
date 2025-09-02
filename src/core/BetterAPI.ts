import http from 'node:http'
import { type Handler, Hono, type Context as HonoContext } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodObject } from 'zod'
import { z } from 'zod'
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
import { mergeZodObjects } from '@/utils/zod'
import type {
  BetterAPIOptions,
  HandlerResponse,
  HttpMethodSignature,
  MergeZodObjects,
  Provided,
  RouteConfig,
} from './types'
import { getResponsesValidationSchema, parseRequestBody } from './utils'

export let globalOpenApiOptions: BetterAPIOptions<
  ZodObject | undefined,
  ZodObject | undefined,
  ZodObject | undefined,
  ZodObject | undefined
> = {}

export class BetterAPI<
  GlobalParams extends ZodObject | undefined = undefined,
  GlobalQuery extends ZodObject | undefined = undefined,
  GlobalHeaders extends ZodObject | undefined = undefined,
  GlobalCookies extends ZodObject | undefined = undefined,
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
    Params extends ZodObject | undefined = undefined,
    Query extends ZodObject | undefined = undefined,
    Headers extends ZodObject | undefined = undefined,
    Cookies extends ZodObject | undefined = undefined,
    Body extends BodySchema | undefined = undefined,
    Form extends FormSchema | undefined = undefined,
    File extends FileSchema | undefined = undefined,
    Files extends FilesSchema | undefined = undefined,
    Responses extends ResponsesSchema | undefined = undefined,
    Dependencies extends
      | Record<string, Provider<unknown>>
      | undefined = undefined,
  >(
    path: string,
    method: string,
    handler: (
      context: Context<
        InferParams<MergeZodObjects<GlobalParams, Params>>,
        InferQuery<MergeZodObjects<GlobalQuery, Query>>,
        InferHeaders<MergeZodObjects<GlobalHeaders, Headers>>,
        InferCookies<MergeZodObjects<GlobalCookies, Cookies>>,
        InferBody<Body>,
        InferForm<Form>,
        InferFile<File>,
        InferFiles<Files>,
        Responses,
        Provided<Dependencies>
      >,
    ) => HandlerResponse<Responses>,
    config?: RouteConfig<
      Params,
      Query,
      Headers,
      Cookies,
      Body & BodySchema,
      Form & FormSchema,
      File & FileSchema,
      Files & FilesSchema,
      Responses & ResponsesSchema,
      Dependencies
    >,
  ) {
    const body = config?.body && normalizeBodySchema(config.body)
    const form = config?.form && normalizeFormSchema(config.form)
    const file = config?.file && normalizeFileSchema(config.file)
    const files = config?.files && normalizeFilesSchema(config.files)
    const responses =
      config?.responses && normalizeResponsesSchema(config?.responses)

    const globalRequestParams = globalOpenApiOptions.globalRequestParams
    const params = mergeZodObjects(globalRequestParams?.params, config?.params)
    const query = mergeZodObjects(globalRequestParams?.query, config?.query)
    const headers = mergeZodObjects(
      globalRequestParams?.headers,
      config?.headers,
    )
    const cookies = mergeZodObjects(
      globalRequestParams?.cookies,
      config?.cookies,
    )

    registerOpenApiRoute({
      path,
      method,
      responses,
      params,
      query,
      headers,
      cookies,
      body,
      form,
      file,
      files,
      summary: config?.summary,
      description: config?.description,
      tags: config?.tags,
      operationId: config?.operationId,
      deprecated: config?.deprecated,
    })

    const wrapper: Handler = (c) =>
      runWithRequestScope(async () => {
        const validationErrors: ValidationErrors = {}

        const rawParams = c.req.param()
        let parsedParams: InferParams<ZodObject> | typeof rawParams = rawParams
        if (params) {
          const { success, data, error } = await params.safeParseAsync(
            rawParams,
            { reportInput: true },
          )
          if (success) {
            parsedParams = data
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
        let parsedQuery: InferQuery<ZodObject> | typeof rawQueries = rawQuery
        if (query) {
          const { success, data, error } = await query.safeParseAsync(
            rawQuery,
            { reportInput: true },
          )
          if (success) {
            parsedQuery = data
          } else {
            validationErrors.query = error
          }
        }

        const rawHeaders = c.req.header() as Record<
          Lowercase<RequestHeader>,
          string
        >
        let parsedHeaders: InferHeaders<ZodObject> | typeof rawHeaders =
          rawHeaders
        if (headers) {
          const { success, data, error } = await headers.safeParseAsync(
            rawHeaders,
            { reportInput: true },
          )
          if (success) {
            parsedHeaders = { ...rawHeaders, ...data }
          } else {
            validationErrors.headers = error
          }
        }

        const rawCookies = getCookie(c)
        let parsedCookies: InferCookies<ZodObject> | typeof rawCookies =
          rawCookies
        if (cookies) {
          const { success, data, error } = await cookies.safeParseAsync(
            rawCookies,
            { reportInput: true },
          )
          if (success) {
            parsedCookies = data
          } else {
            validationErrors.cookies = error
          }
        }

        let parsedBody: InferBody<BodySchema> | undefined
        const jsonResult = await parseRequestBody(c, 'json', body)
        if (jsonResult) {
          if (jsonResult.success) {
            parsedBody = jsonResult.data
          } else {
            validationErrors.body = jsonResult.error
          }
        }

        let parsedForm: InferForm<FormSchema> | undefined
        const formResult = await parseRequestBody(c, 'form', form)
        if (formResult) {
          if (formResult.success) {
            parsedForm = formResult.data
          } else {
            validationErrors.form = formResult.error
          }
        }

        let parsedFile: InferFile<FileSchema> | undefined
        const fileResult = await parseRequestBody(c, 'file', file)
        if (fileResult) {
          if (fileResult.success) {
            parsedFile = fileResult.data
          } else {
            validationErrors.file = fileResult.error
          }
        }

        let parsedFiles: InferFiles<FilesSchema> | undefined
        const filesResult = await parseRequestBody(c, 'files', files)
        if (filesResult) {
          if (filesResult.success) {
            parsedFiles = filesResult.data
          } else {
            validationErrors.files = filesResult.error
          }
        }

        if (Object.keys(validationErrors).length > 0) {
          throw new RequestValidationError(400, validationErrors)
        }

        // dependencies
        let depsObject: Provided<Dependencies> =
          undefined as Provided<Dependencies>
        if (config?.dependencies) {
          const makeCtx = (hono: HonoContext): ProviderContext => {
            const ctx: ProviderContext = {
              hono,
              get: <T>(prov: Provider<T>) => resolveProvider(prov, ctx),
            }
            return ctx
          }
          const providerCtx = makeCtx(c)
          const entries = Object.entries(
            config.dependencies as Record<string, Provider<unknown>>,
          ).map(([k, p]) => [k, resolveProvider(p, providerCtx)] as const)
          depsObject = Object.fromEntries(entries) as Provided<Dependencies>
        }

        const context = new Context(
          c,
          parsedParams as InferParams<MergeZodObjects<GlobalParams, Params>>,
          parsedQuery as InferQuery<MergeZodObjects<GlobalQuery, Query>>,
          parsedHeaders as InferHeaders<
            MergeZodObjects<GlobalHeaders, Headers>
          >,
          parsedCookies as InferCookies<
            MergeZodObjects<GlobalCookies, Cookies>
          >,
          parsedBody as InferBody<Body>,
          parsedForm as InferForm<Form>,
          parsedFile as InferFile<File>,
          parsedFiles as InferFiles<Files>,
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
              statusCode,
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

    this.instance.on(method.toUpperCase(), path, wrapper)
  }

  private createHttpMethod(
    method: string,
  ): HttpMethodSignature<
    GlobalParams,
    GlobalQuery,
    GlobalHeaders,
    GlobalCookies
  > {
    return (path, handler, config) => {
      this.registerRoute(path, method, handler, config)
    }
  }

  get = this.createHttpMethod('get')
  post = this.createHttpMethod('post')
  put = this.createHttpMethod('put')
  delete = this.createHttpMethod('delete')
  patch = this.createHttpMethod('patch')
  options = this.createHttpMethod('options')
}
