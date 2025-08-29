import http from 'node:http'
import z, { ZodFile } from 'zod'
import { globalOpenApiOptions } from '@/BetterAPI'
import 'zod-openapi'
import {
  type ZodOpenApiResponsesObject as _ZodOpenApiResponsesObject,
  createDocument,
  type ZodOpenApiObject,
  type ZodOpenApiOperationObject,
  type ZodOpenApiParameters,
  type ZodOpenApiPathItemObject,
  type ZodOpenApiPathsObject,
} from 'zod-openapi'
import { normalizeResponsesSchema } from './normalizer'
import { openAPIRoutes } from './registry'
import type { OpenApiRouteConfig } from './types'

export function generateDocument(): ReturnType<typeof createDocument> {
  const paths: ZodOpenApiPathsObject = {}

  for (const route of openAPIRoutes) {
    const path = convertExpressPathToOpenAPI(route.path)

    if (!paths[path]) {
      paths[path] = {}
    }

    const pathItem = createZodOpenApiPathItemObject(route)
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

function createZodOpenApiPathItemObject(
  route: OpenApiRouteConfig,
): ZodOpenApiPathItemObject {
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

  let requestBody = route.body

  if (route.form) {
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
  let normalizedGlobalResponses =
    globalOpenApiOptions.globalResponses &&
    normalizeResponsesSchema(globalOpenApiOptions.globalResponses)
  if (route.responses) {
    normalizedGlobalResponses = {
      ...normalizedGlobalResponses,
      ...route.responses,
    }
  }

  if (normalizedGlobalResponses) {
    for (const [statusCode, response] of Object.entries(
      normalizedGlobalResponses,
    )) {
      responses[statusCode as `${1 | 2 | 3 | 4 | 5}${string}`] = {
        description: response.description || http.STATUS_CODES[statusCode],
        content: response.content,
      }
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

/** 将 Hono 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}` */
function convertExpressPathToOpenAPI(path: string) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
}
