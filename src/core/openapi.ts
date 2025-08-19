import http from 'node:http'
import type { StatusCode } from 'hono/utils/http-status'
import z, {
  toJSONSchema,
  type ZodArray,
  ZodFile,
  type ZodObject,
  type ZodType,
} from 'zod'
import type { StatusResponseMap } from '@/hono/api'
import type { HttpMethod, ParameterIn } from '@/types/common'
import type {
  ExampleObject,
  InfoObject,
  OperationObject,
  ParameterObject,
  PathsObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from '@/types/openapi'
import type { ZodHeaderObject, ZodResponseObject } from '@/types/zod'
import { convertResponseSchema } from '@/utils/response'

function buildHeaders(
  headers?: Record<string, ZodHeaderObject | ReferenceObject>,
) {
  if (!headers) {
    return undefined
  }

  const processedHeaders: ResponseObject['headers'] = {}

  for (const [headerName, headerConfig] of Object.entries(headers)) {
    if (
      headerConfig &&
      typeof headerConfig === 'object' &&
      '$ref' in headerConfig
    ) {
      processedHeaders[headerName] = headerConfig
    } else {
      processedHeaders[headerName] = {
        ...headerConfig,
        schema: toJSONSchema(headerConfig.schema) as SchemaObject,
      }
    }
  }

  return Object.keys(processedHeaders).length > 0 ? processedHeaders : undefined
}

interface RouteSchema {
  path: string
  method: string
  response?: Partial<Record<StatusCode, ZodResponseObject>>
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
  security?: SecurityRequirementObject[]
}

const globalRouteSchemas: RouteSchema[] = []

export function addRouteSchema(schema: RouteSchema) {
  globalRouteSchemas.push(schema)
}

let metaInfo: Partial<InfoObject> | undefined
let metaServers: ServerObject[] | undefined
let metaTags: TagObject[] | undefined
let globalSecurity: SecurityRequirementObject[] | undefined
let securitySchemes: Record<string, SecuritySchemeObject> | undefined
let globalResponses: StatusResponseMap = {}

export function configureOpenAPI(options: {
  info?: Partial<InfoObject>
  servers?: ServerObject[]
  tags?: TagObject[]
}) {
  metaInfo = options.info ?? metaInfo
  metaServers = options.servers ?? metaServers
  metaTags = options.tags ?? metaTags
}

export function setSecuritySchemes(
  schemes: Record<string, SecuritySchemeObject>,
) {
  securitySchemes = schemes
}

export function setGlobalSecurity(security: SecurityRequirementObject[]) {
  globalSecurity = security
}

export function setGlobalResponses(responses: StatusResponseMap) {
  globalResponses = responses
}

export function buildResponses(
  schema: Partial<Record<StatusCode, ZodResponseObject>>,
) {
  const responses: ResponsesObject = {}

  for (const [statusCode, responseConfig] of Object.entries(schema)) {
    const content: ResponseObject['content'] = {}
    for (const [mediaType, mediaConfig] of Object.entries(
      responseConfig.content,
    )) {
      const jsonSchema = toJSONSchema(mediaConfig.schema) as SchemaObject
      content[mediaType] = {
        ...mediaConfig,
        schema: jsonSchema,
      }
    }

    responses[statusCode] = {
      ...responseConfig,
      description:
        responseConfig.description || http.STATUS_CODES[statusCode] || '',
      content,
      headers: buildHeaders(responseConfig.headers),
    }
  }

  return responses
}

function buildParametersFromObject(where: ParameterIn, schema?: ZodObject) {
  if (!schema) {
    return []
  }

  const parameters: ParameterObject[] = []

  const jsonSchema = toJSONSchema(schema)
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    for (const [name, propSchema] of Object.entries(jsonSchema.properties)) {
      const objectSchema =
        typeof propSchema === 'object'
          ? (propSchema as SchemaObject & Record<string, unknown>)
          : {}
      const param: ParameterObject = {
        name,
        in: where,
        required:
          where === 'path'
            ? true
            : (jsonSchema.required?.includes(name) ?? false),
        schema: objectSchema,
        description: objectSchema.description,
        deprecated: objectSchema.deprecated,
        example: objectSchema.example,
        examples: objectSchema.examples as unknown as Record<
          string,
          ReferenceObject | ExampleObject
        >,
      }

      parameters.push(param)
    }
  }

  return parameters
}

function buildRequestBody(
  schemas: Pick<RouteSchema, 'body' | 'form' | 'file' | 'files'>,
) {
  const requestBody: RequestBodyObject = {
    content: {},
  }

  const { body, form, file, files } = schemas

  if (body) {
    requestBody.content['application/json'] = {
      schema: toJSONSchema(body) as SchemaObject,
    }
  }

  if (form) {
    const jsonSchema = toJSONSchema(form) as SchemaObject
    requestBody.content['multipart/form-data'] = {
      schema: jsonSchema,
    }

    const hasFile = Object.values(form.shape).some((v) => v instanceof ZodFile)
    if (!hasFile) {
      requestBody.content['application/x-www-form-urlencoded'] = {
        schema: jsonSchema,
      }
    }
  }

  if (file) {
    requestBody.content['multipart/form-data'] = {
      schema: toJSONSchema(z.object({ file })) as SchemaObject,
    }
  }

  if (files) {
    requestBody.content['multipart/form-data'] = {
      schema: toJSONSchema(z.object({ files })) as SchemaObject,
    }
  }

  return Object.keys(requestBody.content).length > 0 ? requestBody : undefined
}

/**
 * 将 Hono 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}`
 */
function convertExpressPathToOpenAPI(path: string) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
}

export function generateOpenAPI() {
  const paths: PathsObject = {}

  for (const route of globalRouteSchemas) {
    const path = convertExpressPathToOpenAPI(route.path)

    if (!paths[path]) {
      paths[path] = {}
    }

    const method = route.method.toLowerCase() as HttpMethod
    if (!paths[path][method]) {
      const parameters: ParameterObject[] = [
        ...buildParametersFromObject('path', route.params),
        ...buildParametersFromObject('query', route.query),
        ...buildParametersFromObject('header', route.headers),
        ...buildParametersFromObject('cookie', route.cookies),
      ]

      const requestBody = buildRequestBody({
        body: route.body,
        form: route.form,
        file: route.file,
        files: route.files,
      })

      let mergedResponses: Partial<Record<StatusCode, ZodResponseObject>> = {}

      if (globalResponses) {
        const convertedGlobalResponses = convertResponseSchema(globalResponses)
        if (convertedGlobalResponses) {
          mergedResponses = convertedGlobalResponses
        }
      }

      // 再添加路由特定响应（会覆盖同状态码的全局响应）
      if (route.response) {
        mergedResponses = { ...mergedResponses, ...route.response }
      }

      const operation: OperationObject = {
        responses: buildResponses(mergedResponses),
      }

      if (route.summary) {
        operation.summary = route.summary
      }
      if (route.description) {
        operation.description = route.description
      }
      if (route.tags) {
        operation.tags = route.tags
      }
      if (route.operationId) {
        operation.operationId = route.operationId
      }
      if (route.deprecated !== undefined) {
        operation.deprecated = route.deprecated
      }
      if (route.security) {
        operation.security = route.security
      }
      if (parameters.length > 0) {
        operation.parameters = parameters
      }
      if (requestBody) {
        operation.requestBody = requestBody
      }

      paths[path][method] = operation
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: metaInfo?.title ?? 'API',
      version: metaInfo?.version ?? '1.0.0',
      summary: metaInfo?.summary,
      description: metaInfo?.description,
      termsOfService: metaInfo?.termsOfService,
      contact: metaInfo?.contact,
      license: metaInfo?.license,
    },
    ...(metaServers ? { servers: metaServers } : {}),
    paths,
    ...(metaTags ? { tags: metaTags } : {}),
    ...(securitySchemes ? { components: { securitySchemes } } : {}),
    ...(globalSecurity ? { security: globalSecurity } : {}),
  }
}
