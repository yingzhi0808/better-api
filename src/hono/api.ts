import { type Handler, Hono, type Context as HonoCtx } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { Cookie } from 'hono/utils/cookie'
import type { RequestHeader } from 'hono/utils/headers'
import type { StatusCode } from 'hono/utils/http-status'
import type { ZodArray, ZodFile, ZodObject, ZodType, z } from 'zod'
import {
  kSecurityMeta,
  type Provider,
  type ProviderContext,
  resolveProvider,
  runWithRequestScope,
} from '@/core/di'
import { addRouteSchema } from '@/core/openapi'
import type { RouteDefinition } from '@/hono/route'
import type { HttpMethod } from '@/types/common'
import type { SecurityRequirementObject } from '@/types/openapi'
import { isZodType } from '@/utils/zod'

export class JsonResponse<
  Body,
  const Status extends StatusCode = 200,
> extends Response {
  constructor(body: Body, status?: Status) {
    super(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export type ResponseSchemaMap = Partial<Record<StatusCode, ZodType>>

type SchemaToResponse<SchemaMap extends ResponseSchemaMap> = {
  [Status in keyof SchemaMap]: z.input<SchemaMap[Status]>
}

export type HandlerReturnType<ResponseSchema> =
  ResponseSchema extends ResponseSchemaMap
    ? {
        [K in keyof ResponseSchema]: K extends StatusCode
          ?
              | JsonResponse<SchemaToResponse<ResponseSchema>[K], K>
              | SchemaToResponse<ResponseSchema>[K]
          : never
      }[keyof ResponseSchema]
    : ResponseSchema extends ZodType
      ? JsonResponse<z.input<ResponseSchema>, 200> | z.input<ResponseSchema>
      : ResponseSchema extends undefined
        ? unknown
        : never

type Provided<Deps extends Record<string, Provider<unknown>> | undefined> =
  Deps extends Record<string, Provider<unknown>>
    ? { [K in keyof Deps]: Promise<Awaited<ReturnType<Deps[K]>>> }
    : undefined

type ParamsOf<T> = T extends ZodObject ? z.infer<T> : Record<string, string>
type QueryOf<T> = T extends ZodObject
  ? z.infer<T>
  : Record<string, string | string[]>
type HeadersOf<T> = T extends ZodObject
  ? z.infer<T> & Record<Lowercase<RequestHeader>, string>
  : Record<Lowercase<RequestHeader>, string>
type CookiesOf<T> = T extends ZodObject ? z.infer<T> : Cookie
type BodyOf<T> = T extends ZodType ? z.infer<T> : never
type FormOf<T> = T extends ZodObject ? z.infer<T> : never
type FileOf<T> = T extends ZodFile ? z.infer<T> : never
type FilesOf<T> = T extends ZodArray<ZodFile> ? z.infer<T> : never

export class Context<
  ResponseSchema,
  ParamsSchema,
  QuerySchema,
  HeadersSchema,
  CookiesSchema,
  BodySchema,
  FormSchema,
  FileSchema,
  FilesSchema,
  Deps extends Record<string, Provider<unknown>> | undefined,
> {
  constructor(
    public readonly hono: HonoCtx,
    public readonly params: ParamsOf<ParamsSchema>,
    public readonly query: QueryOf<QuerySchema>,
    public readonly headers: HeadersOf<HeadersSchema>,
    public readonly cookies: CookiesOf<CookiesSchema>,
    public readonly body: BodyOf<BodySchema>,
    public readonly form: FormOf<FormSchema>,
    public readonly file: FileOf<FileSchema>,
    public readonly files: FilesOf<FilesSchema>,
    public readonly deps: Provided<Deps>,
  ) {}

  json<
    Data extends ResponseSchema extends ResponseSchemaMap
      ? SchemaToResponse<ResponseSchema>[Status]
      : ResponseSchema extends ZodType
        ? z.input<ResponseSchema>
        : ResponseSchema extends undefined
          ? unknown
          : never,
    const Status extends StatusCode = 200,
  >(data: Data, status?: Status) {
    return new JsonResponse(data, status)
  }
}

export interface RouteOptions<
  ResponseSchema,
  ParamsSchema,
  QuerySchema,
  HeadersSchema,
  CookiesSchema,
  BodySchema,
  FormSchema,
  FileSchema,
  FilesSchema,
  Deps,
> {
  response?: ResponseSchema
  params?: ParamsSchema
  query?: QuerySchema
  headers?: HeadersSchema
  cookies?: CookiesSchema
  body?: BodySchema
  form?: FormSchema
  file?: FileSchema
  files?: FilesSchema
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
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    def: RouteDefinition<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
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
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    method: HttpMethod,
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    options?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
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

    addRouteSchema({
      path,
      method,
      response: isZodType(options?.response)
        ? { 200: options?.response }
        : options?.response,
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
          const rawFiles = Array.isArray(rawForm.files) ? rawForm.files : [rawForm.files]
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
          ResponseSchema,
          ParamsSchema,
          QuerySchema,
          HeadersSchema,
          CookiesSchema,
          BodySchema,
          FormSchema,
          FileSchema,
          FilesSchema,
          Deps
        >(
          c,
          typedParams as ParamsOf<ParamsSchema>,
          typedQuery as QueryOf<QuerySchema>,
          typedHeaders as HeadersOf<HeadersSchema>,
          typedCookies as CookiesOf<CookiesSchema>,
          typedBody as BodyOf<BodySchema>,
          typedForm as FormOf<FormSchema>,
          typedFile as FileOf<FileSchema>,
          typedFiles as FilesOf<FilesSchema>,
          depsObject,
        )

        let result: unknown
        result = await handler(context)

        if (!options?.response) {
          const resMaybe = result as JsonResponse<unknown, StatusCode> | unknown
          const responseFinal =
            resMaybe instanceof JsonResponse
              ? resMaybe
              : new JsonResponse(result as unknown, 200)
          return responseFinal
        }

        const resMaybe = result as JsonResponse<unknown, StatusCode> | unknown
        const responseData = await (resMaybe instanceof JsonResponse
          ? resMaybe.clone().json()
          : result)
        const statusCode =
          resMaybe instanceof JsonResponse
            ? (resMaybe.status as StatusCode)
            : 200
        const schemaForStatus = isZodType(options.response)
          ? options.response
          : options.response[statusCode]!

        const { success, data, error } =
          await schemaForStatus.safeParseAsync(responseData)
        if (success) {
          const responseFinal = new JsonResponse(data as unknown, statusCode)
          return responseFinal
        }

        throw new HTTPException(500, {
          res: new JsonResponse(
            { message: 'Response validation failed', issues: error.issues },
            500,
          ),
        })
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
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('post', path, handler, schema)
  }

  get<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('get', path, handler, schema)
  }

  put<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('put', path, handler, schema)
  }

  delete<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('delete', path, handler, schema)
  }

  patch<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('patch', path, handler, schema)
  }

  options<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('options', path, handler, schema)
  }

  head<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('head', path, handler, schema)
  }

  trace<
    ResponseSchema extends ResponseSchemaMap | ZodType | undefined = undefined,
    ParamsSchema extends ZodObject | undefined = undefined,
    QuerySchema extends ZodObject | undefined = undefined,
    HeadersSchema extends ZodObject | undefined = undefined,
    CookiesSchema extends ZodObject | undefined = undefined,
    BodySchema extends ZodType | undefined = undefined,
    FormSchema extends ZodObject | undefined = undefined,
    FileSchema extends ZodFile | undefined = undefined,
    FilesSchema extends ZodArray<ZodFile> | undefined = undefined,
    Deps extends Record<string, Provider<unknown>> | undefined = undefined,
  >(
    path: string,
    handler: (
      context: Context<
        ResponseSchema,
        ParamsSchema,
        QuerySchema,
        HeadersSchema,
        CookiesSchema,
        BodySchema,
        FormSchema,
        FileSchema,
        FilesSchema,
        Deps
      >,
    ) =>
      | HandlerReturnType<ResponseSchema>
      | Promise<HandlerReturnType<ResponseSchema>>,
    schema?: RouteOptions<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >,
  ) {
    this.registerRoute<
      ResponseSchema,
      ParamsSchema,
      QuerySchema,
      HeadersSchema,
      CookiesSchema,
      BodySchema,
      FormSchema,
      FileSchema,
      FilesSchema,
      Deps
    >('trace', path, handler, schema)
  }
}
