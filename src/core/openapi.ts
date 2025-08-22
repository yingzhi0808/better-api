import http from 'node:http'
import z, { type ZodArray, ZodFile, type ZodObject, type ZodType } from 'zod'
import type {
  BetterApiResponse,
  BetterApiResponses,
  ZodOpenApiResponsesObject,
} from '@/types/response'
import { normalizeZodOpenApiResponses } from '@/utils/response'
import 'zod-openapi'
import type { StatusCode } from 'hono/utils/http-status'
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
import { convertExpressPathToOpenAPI } from '@/utils/openapi'

export interface BetterAPIOptions {
  openapi?: Partial<Omit<ZodOpenApiObject, 'paths'>>
  createDocumentOptions?: CreateDocumentOptions
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
let globalOpenApiOptions: BetterAPIOptions = {}

export function registerOpenApiRoute(route: OpenApiRoute) {
  globalRoutes.push(route)
}

export function setGlobalOpenApiOptions(options: BetterAPIOptions) {
  globalOpenApiOptions = options
}

let globalResponses: BetterApiResponses = {}

export function setGlobalResponses(
  responses: Partial<Record<StatusCode, BetterApiResponse>>,
) {
  globalResponses = responses
}

export function generateOpenAPI() {
  const paths: ZodOpenApiPathsObject = {}

  for (const route of globalRoutes) {
    const path = convertExpressPathToOpenAPI(route.path)

    if (!paths[path]) {
      paths[path] = {}
    }

    const pathOperation = createZodOpenApiPath(route)
    paths[path] = { ...paths[path], ...pathOperation }
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

function createZodOpenApiPath(route: OpenApiRoute) {
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
    requestBody = {
      content: {
        'application/json': { schema: route.body },
      },
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
          : { 'application/x-www-form-urlencoded': { schema: route.form } }),
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
