import { type Handler, Hono, type Context as HonoCtx } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodArray, ZodFile, ZodObject, ZodType } from 'zod'
import { Context } from '@/core/context'
import {
  kSecurityMeta,
  type Provider,
  type ProviderContext,
  resolveProvider,
  runWithRequestScope,
} from '@/core/di'
import { addRouteSchema } from '@/core/openapi'
import { JsonResponse } from '@/core/response'
import type { RouteDefinition } from '@/hono/route'
import type { HttpMethod } from '@/types/common'
import type { SecurityRequirementObject } from '@/types/openapi'
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
  SimplifiedZodResponseObject,
  ZodResponseObject,
} from '@/types/zod'
import { convertResponseSchema } from '@/utils/response'

// 获取用于校验的schema，基于统一的ZodResponseObject格式
function getValidationSchema(
  convertedResponse: Partial<Record<StatusCode, ZodResponseObject>>,
  statusCode: StatusCode,
) {
  const responseConfig = convertedResponse[statusCode]
  if (!responseConfig) {
    return null
  }

  const jsonContent = responseConfig.content['application/json']
  return jsonContent.schema
}

// 统一的ResponseConfigMap类型，支持三种值类型：
// 1. ZodType - 向后兼容原ResponseSchemaMap
// 2. ZodResponseConfig - { description, schema, ... }
// 3. ZodResponseObject - { description, content, ... }
export type StatusResponseMap = Partial<
  Record<StatusCode, ZodType | SimplifiedZodResponseObject | ZodResponseObject>
>

export type ResponseSpec =
  | ZodType
  | SimplifiedZodResponseObject
  | ZodResponseObject
  | StatusResponseMap

export type HandlerReturnType<ResponseDefinition> =
  | InferAllResponses<ResponseDefinition>
  | Response
  | Promise<InferAllResponses<ResponseDefinition> | Response>

export type Provided<
  Deps extends Record<string, Provider<unknown>> | undefined,
> = Deps extends Record<string, Provider<unknown>>
  ? { [K in keyof Deps]: Promise<Awaited<ReturnType<Deps[K]>>> }
  : undefined

export interface RouteConfig<
  ResponseDefinition,
  ParamsDefinition,
  QueryDefinition,
  HeadersDefinition,
  CookiesDefinition,
  BodyDefinition,
  FormDefinition,
  FileDefinition,
  FilesDefinition,
  Deps,
> {
  response?: ResponseDefinition
  params?: ParamsDefinition
  query?: QueryDefinition
  headers?: HeadersDefinition
  cookies?: CookiesDefinition
  body?: BodyDefinition
  form?: FormDefinition
  file?: FileDefinition
  files?: FilesDefinition
  deps?: Deps
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
  security?: SecurityRequirementObject[]
}

export class BetterAPI {
  private instance = new Hono()

  getInstance() {
    return this.instance
  }

  // 批量挂载
  mountMany(defs: RouteDefinition[]) {
    for (const d of defs) {
      this.registerRoute(
        d.method as HttpMethod,
        d.path,
        d.handler as never,
        d.schema as never,
      )
    }
  }

  // 单个挂载
  mount<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    def: RouteDefinition<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute(
      def.method as HttpMethod,
      def.path,
      def.handler as never,
      def.schema as never,
    )
  }

  // 路由分组
  group(
    prefix: string,
    opts: { tags?: string[]; deps?: Record<string, Provider<unknown>> },
    build: (g: BetterAPI) => void,
  ) {
    const sub = new BetterAPI()
    const inst = sub.getInstance()
    this.instance.route(prefix, inst)
    // 仅将 tags 合并到子路由注册时使用（通过 schema.tags 默认值）
    const origRegister: BetterAPI['registerRoute'] = (
      sub as unknown as { registerRoute: BetterAPI['registerRoute'] }
    ).registerRoute.bind(sub)
    ;(
      sub as unknown as { registerRoute: BetterAPI['registerRoute'] }
    ).registerRoute = (method, path, handler, schema) => {
      const merged: NonNullable<typeof schema> = {
        ...(schema as object),
      } as NonNullable<typeof schema>
      if (opts?.tags?.length) {
        ;(merged as { tags?: string[] }).tags = Array.from(
          new Set([
            ...(schema && (schema as { tags?: string[] }).tags
              ? (schema as { tags?: string[] }).tags!
              : []),
            ...opts.tags,
          ]),
        )
      }
      if (opts?.deps) {
        ;(merged as { deps?: Record<string, Provider<unknown>> }).deps = {
          ...(schema &&
          (schema as { deps?: Record<string, Provider<unknown>> }).deps
            ? (schema as { deps?: Record<string, Provider<unknown>> }).deps!
            : {}),
          ...opts.deps,
        }
      }
      return origRegister(method, path, handler, merged)
    }
    build(sub)
  }

  // 中间件支持
  use(...args: Parameters<Hono['use']>) {
    const u = this.instance.use.bind(this.instance) as (
      ...as: Parameters<Hono['use']>
    ) => unknown
    u(...args)
  }

  private registerRoute<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    method: HttpMethod,
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    // auto derive security from deps
    let derivedSecurity: SecurityRequirementObject[] | undefined
    if (options?.deps) {
      const reqs: SecurityRequirementObject[] = []
      for (const [, prov] of Object.entries(
        options.deps as Record<string, Provider<unknown>>,
      )) {
        const meta = (
          prov as unknown as Record<
            symbol,
            { scheme: string; scopes?: string[] }
          >
        )[kSecurityMeta as unknown as symbol]
        if (meta?.scheme) {
          reqs.push({ [meta.scheme]: meta.scopes ?? [] })
        }
      }
      if (reqs.length) {
        derivedSecurity = reqs
      }
    }

    // 转换响应配置为统一的ZodResponseObject格式
    const convertedResponse = convertResponseSchema(options?.response)

    addRouteSchema({
      path,
      method,
      response: convertedResponse,
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
      security: options?.security ?? derivedSecurity,
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

        // deps
        let depsObject: Provided<Deps> = undefined as Provided<Deps>
        if (options?.deps) {
          const makeCtx = (hono: HonoCtx): ProviderContext => {
            const ctx: ProviderContext = {
              hono,
              get: <T>(prov: Provider<T>) => resolveProvider(prov, ctx),
            }
            return ctx
          }
          const providerCtx = makeCtx(c)
          const entries = Object.entries(
            options.deps as Record<string, Provider<unknown>>,
          ).map(([k, p]) => [k, resolveProvider(p, providerCtx)] as const)
          depsObject = Object.fromEntries(entries) as Provided<Deps>
        }

        const context = new Context<
          ResponseDefinition,
          ParamsDefinition,
          QueryDefinition,
          HeadersDefinition,
          CookiesDefinition,
          BodyDefinition,
          FormDefinition,
          FileDefinition,
          FilesDefinition,
          Deps
        >(
          c,
          typedParams as InferParams<ParamsDefinition>,
          typedQuery as InferQuery<QueryDefinition>,
          typedHeaders as InferHeaders<HeadersDefinition>,
          typedCookies as InferCookies<CookiesDefinition>,
          typedBody as InferBody<BodyDefinition>,
          typedForm as InferForm<FormDefinition>,
          typedFile as InferFile<FileDefinition>,
          typedFiles as InferFiles<FilesDefinition>,
          depsObject,
        )

        const result = await handler(context)

        if (convertedResponse) {
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
              convertedResponse,
              statusCode,
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
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('post', path, handler, options)
  }

  get<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('get', path, handler, options)
  }

  put<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('put', path, handler, options)
  }

  delete<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('delete', path, handler, options)
  }

  patch<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('patch', path, handler, options)
  }

  options<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('options', path, handler, options)
  }

  head<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('head', path, handler, options)
  }

  trace<
    ResponseDefinition extends ResponseSpec,
    ParamsDefinition extends ZodObject | undefined = undefined,
    QueryDefinition extends ZodObject | undefined = undefined,
    HeadersDefinition extends ZodObject | undefined = undefined,
    CookiesDefinition extends ZodObject | undefined = undefined,
    BodyDefinition extends ZodType | undefined = undefined,
    FormDefinition extends ZodObject | undefined = undefined,
    FileDefinition extends ZodFile | undefined = undefined,
    FilesDefinition extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseDefinition,
        ParamsDefinition,
        QueryDefinition,
        HeadersDefinition,
        CookiesDefinition,
        BodyDefinition,
        FormDefinition,
        FileDefinition,
        FilesDefinition,
        Deps
      >,
    ) => HandlerReturnType<ResponseDefinition>,
    options?: RouteConfig<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseDefinition,
      ParamsDefinition,
      QueryDefinition,
      HeadersDefinition,
      CookiesDefinition,
      BodyDefinition,
      FormDefinition,
      FileDefinition,
      FilesDefinition,
      Deps
    >('trace', path, handler, options)
  }
}
