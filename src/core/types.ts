import type { StatusCode } from 'hono/utils/http-status'
import type { ZodObject } from 'zod'
import type { CreateDocumentOptions, ZodOpenApiObject } from 'zod-openapi'
import type { Context } from '@/context'
import type { Provider } from '@/di'
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
} from '@/openapi'

export interface RouteConfig<
  Params,
  Query,
  Headers,
  Cookies,
  Body,
  Form,
  File,
  Files,
  Responses,
  Dependencies,
> {
  params?: Params
  query?: Query
  headers?: Headers
  cookies?: Cookies
  body?: Body
  form?: Form
  file?: File
  files?: Files
  responses?: Responses
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
  dependencies?: Dependencies
}

export type HandlerResponse<Responses> =
  | Response
  | InferAllResponses<Responses>
  | Promise<InferAllResponses<Responses> | Response>

export type MergeZodObjects<Global, Local> = Global extends ZodObject
  ? Local extends ZodObject
    ? Local & Global
    : Global
  : Local extends ZodObject
    ? Local
    : Record<string, string>

export type Provided<Dependencies extends Record<string, Provider<unknown>> | undefined> =
  Dependencies extends Record<string, Provider<unknown>>
    ? {
        [K in keyof Dependencies]: Promise<Awaited<ReturnType<Dependencies[K]>>>
      }
    : undefined

export type HttpMethodSignature<
  GlobalParams extends ZodObject | undefined,
  GlobalQuery extends ZodObject | undefined,
  GlobalHeaders extends ZodObject | undefined,
  GlobalCookies extends ZodObject | undefined,
> = <
  Params extends ZodObject | undefined = undefined,
  Query extends ZodObject | undefined = undefined,
  Headers extends ZodObject | undefined = undefined,
  Cookies extends ZodObject | undefined = undefined,
  Body extends BodySchema | undefined = undefined,
  Form extends FormSchema | undefined = undefined,
  File extends FileSchema | undefined = undefined,
  Files extends FilesSchema | undefined = undefined,
  Responses extends ResponsesSchema | undefined = undefined,
  Dependencies extends Record<string, Provider<unknown>> | undefined = undefined,
>(
  path: string,
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
) => void

export interface BetterAPIOptions<
  GlobalParams extends ZodObject | undefined = undefined,
  GlobalQuery extends ZodObject | undefined = undefined,
  GlobalHeaders extends ZodObject | undefined = undefined,
  GlobalCookies extends ZodObject | undefined = undefined,
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
