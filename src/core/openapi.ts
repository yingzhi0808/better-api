import http from 'node:http'
import type { StatusCode } from 'hono/utils/http-status'
import z, { type ZodArray, ZodFile, type ZodObject, type ZodType } from 'zod'
import type {
  BetterApiResponse,
  BetterApiResponses,
  ZodOpenApiResponsesObject,
} from '@/types/response'
import { convertExpressPathToOpenAPI } from '@/utils/openapi'
import { normalizeZodOpenApiResponses } from '@/utils/response'
import 'zod-openapi'
import {
  type ZodOpenApiResponsesObject as _ZodOpenApiResponsesObject,
  type CreateDocumentOptions,
  createDocument,
  type ZodOpenApiObject,
  type ZodOpenApiOperationObject,
  type ZodOpenApiParameters,
  type ZodOpenApiPathsObject,
  type ZodOpenApiRequestBodyObject,
} from 'zod-openapi'

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
}

interface OpenApiRoute {
  path: string
  method: string
  responses?: ZodOpenApiResponsesObject
  params?: ZodObject
  query?: ZodObject
  headers?: ZodObject
  cookies?: ZodObject
  body?: ZodType
  form?: ZodObject
  file?: ZodFile
  files?: ZodArray<ZodFile>
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
}

const globalRoutes: OpenApiRoute[] = []
export let globalOpenApiOptions: BetterAPIOptions<
  ZodObject,
  ZodObject,
  ZodObject,
  ZodObject
> = {}

export function registerOpenApiRoute(route: OpenApiRoute) {
  globalRoutes.push(route)
}

export function setGlobalOpenApiOptions(
  options: BetterAPIOptions<ZodObject, ZodObject, ZodObject, ZodObject>,
) {
  globalOpenApiOptions = options
}

let globalResponses: BetterApiResponses = {}

export function setGlobalResponses(
  responses: Partial<Record<StatusCode, BetterApiResponse>>,
) {
  globalResponses = responses
}

// 全局默认请求参数泛型接口
export interface GlobalRequestParams {
  /** 全局路径参数 */
  params?: ZodObject
  /** 全局查询参数 */
  query?: ZodObject
  /** 全局请求头参数 */
  headers?: ZodObject
  /** 全局 Cookie 参数 */
  cookies?: ZodObject
}

/**
 * 合并全局请求参数和路由特定参数
 */
function mergeRequestParams(route: OpenApiRoute) {
  const mergedParams = {
    params: {
      ...globalOpenApiOptions.globalRequestParams?.params,
      ...route.params,
    },
    query: {
      ...globalOpenApiOptions.globalRequestParams?.query,
      ...route.query,
    },
    headers: {
      ...globalOpenApiOptions.globalRequestParams?.headers,
      ...route.headers,
    },
    cookies: {
      ...globalOpenApiOptions.globalRequestParams?.cookies,
      ...route.cookies,
    },
    body: route.body,
    form: route.form,
    file: route.file,
    files: route.files,
  }

  return mergedParams
}

export function generateOpenAPI() {
  const paths: ZodOpenApiPathsObject = {}

  for (const route of globalRoutes) {
    const path = convertExpressPathToOpenAPI(route.path)

    if (!paths[path]) {
      paths[path] = {}
    }

    const pathItem = createZodOpenApiPathItem(route)
    paths[path] = { ...paths[path], ...pathItem }
  }

  const mergedConfig: ZodOpenApiObject = {
    openapi: '3.1.0',
    info: {
      title: 'API',
      version: '1.0.0',
    },
    paths,
    ...globalOpenApiOptions.openapi,
  }

  return createDocument(
    mergedConfig,
    globalOpenApiOptions.createDocumentOptions,
  )
}

function createZodOpenApiPathItem(route: OpenApiRoute) {
  const mergedParams = mergeRequestParams(route)
  const requestParams: ZodOpenApiParameters = {}

  let requestBody: ZodOpenApiRequestBodyObject | undefined
  if (mergedParams.body) {
    requestBody = {
      content: {
        'application/json': { schema: mergedParams.body },
      },
    }
  } else if (mergedParams.form) {
    const hasFile = Object.values(mergedParams.form.shape).some(
      (v) => v instanceof ZodFile,
    )
    requestBody = {
      content: {
        'multipart/form-data': { schema: mergedParams.form },
        ...(hasFile
          ? {}
          : {
              'application/x-www-form-urlencoded': {
                schema: mergedParams.form,
              },
            }),
      },
    }
  } else if (route.file) {
    requestBody = {
      content: {
        'multipart/form-data': { schema: z.object({ file: route.file }) },
      },
    }
  } else if (route.files) {
    requestBody = {
      content: {
        'multipart/form-data': { schema: z.object({ files: route.files }) },
      },
    }
  }

  const responses: _ZodOpenApiResponsesObject = {}
  let normalizedGlobalResponses =
    normalizeZodOpenApiResponses(globalResponses) ?? {}
  if (route.responses) {
    normalizedGlobalResponses = {
      ...normalizedGlobalResponses,
      ...route.responses,
    }
  }

  for (const [statusCode, response] of Object.entries(
    normalizedGlobalResponses,
  )) {
    responses[statusCode as `${1 | 2 | 3 | 4 | 5}${string}`] = {
      description: response.description || http.STATUS_CODES[statusCode],
      content: response.content,
    }
  }

  const operation: ZodOpenApiOperationObject = {
    requestParams,
    requestBody,
    responses,
    summary: route.summary,
    description: route.description,
    tags: route.tags,
    operationId: route.operationId,
    deprecated: route.deprecated,
  }

  return { [route.method]: operation }
}
