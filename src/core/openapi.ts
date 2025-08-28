import http from 'node:http'
import z, { type ZodArray, ZodFile, type ZodObject, type ZodType } from 'zod'
import type { BodyOption } from '@/types/common'
import type { ZodOpenApiResponsesObject } from '@/types/response'
import { convertExpressPathToOpenAPI } from '@/utils/openapi'
import { normalizeZodOpenApiResponses } from '@/utils/response'
import { isZodType } from '@/utils/zod'
import 'zod-openapi'
import {
  type ZodOpenApiResponsesObject as _ZodOpenApiResponsesObject,
  createDocument,
  type ZodOpenApiObject,
  type ZodOpenApiOperationObject,
  type ZodOpenApiParameters,
  type ZodOpenApiPathsObject,
  type ZodOpenApiRequestBodyObject,
} from 'zod-openapi'
import { globalOpenApiOptions } from './api'

interface OpenApiRoute {
  path: string
  method: string
  responses?: ZodOpenApiResponsesObject
  params?: ZodObject
  query?: ZodObject
  headers?: ZodObject
  cookies?: ZodObject
  body?: BodyOption<ZodType>
  form?: ZodObject
  file?: ZodFile
  files?: ZodArray<ZodFile>
  summary?: string
  description?: string
  tags?: string[]
  operationId?: string
  deprecated?: boolean
}

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

const globalRoutes: OpenApiRoute[] = []

export function registerOpenApiRoute(route: OpenApiRoute) {
  globalRoutes.push(route)
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

  const document = createDocument(
    mergedConfig,
    globalOpenApiOptions.createDocumentOptions,
  )

  return document
}

function createZodOpenApiPathItem(route: OpenApiRoute) {
  const requestParams: ZodOpenApiParameters = {}

  if (route.params) {
    requestParams.path = route.params
  }

  if (route.query) {
    requestParams.query = route.query
  }

  if (route.headers) {
    requestParams.header = route.headers
  }

  if (route.cookies) {
    requestParams.cookie = route.cookies
  }

  let requestBody: ZodOpenApiRequestBodyObject | undefined
  if (route.body) {
    let schema: ZodType | undefined
    let description: string | undefined
    let required = true

    // 处理两种body写法
    if (isZodType(route.body)) {
      schema = route.body
    } else if (typeof route.body === 'object' && 'schema' in route.body) {
      schema = route.body.schema
      description = route.body.description
      required = route.body.required !== false
    }

    if (schema) {
      requestBody = {
        description,
        required,
        content: {
          'application/json': { schema },
        },
      }
    }
  } else if (route.form) {
    const hasFile = Object.values(route.form.shape).some(
      (v) => v instanceof ZodFile,
    )
    requestBody = {
      content: {
        'multipart/form-data': { schema: route.form },
        ...(hasFile
          ? {}
          : {
              'application/x-www-form-urlencoded': {
                schema: route.form,
              },
            }),
      },
    }
  } else if (route.file) {
    requestBody = {
      content: {
        'multipart/form-data': {
          schema: z.object({ file: route.file }),
        },
      },
    }
  } else if (route.files) {
    requestBody = {
      content: {
        'multipart/form-data': {
          schema: z.object({ files: route.files }),
        },
      },
    }
  }

  const responses: _ZodOpenApiResponsesObject = {}
  let normalizedGlobalResponses = normalizeZodOpenApiResponses(
    globalOpenApiOptions.globalResponses ?? {},
  )
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
