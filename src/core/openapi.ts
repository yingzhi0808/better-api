import http from 'node:http'
import type { StatusCode } from 'hono/utils/http-status'
import z, {
  toJSONSchema,
  type ZodArray,
  ZodFile,
  type ZodObject,
  type ZodType,
} from 'zod'
import type { HttpMethod, ParameterIn } from '@/types/common'
import type {
  ExampleObject,
  HeaderObject,
  InfoObject,
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  PathsObject,
  ReferenceObject,
  RequestBodyObject,
  ResponsesObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from '@/types/openapi'
import type {
  SimplifiedZodResponseObject,
  ZodHeaderObject,
  ZodResponseObject,
} from '@/types/zod'
import { isZodResponseObject } from '@/utils/response'

// 辅助函数：处理headers中的zod schema
function processHeaders(
  headers?: Record<string, ZodHeaderObject | ReferenceObject>,
): Record<string, HeaderObject | ReferenceObject> | undefined {
  if (!headers) {
    return undefined
  }

  const processedHeaders: Record<string, HeaderObject | ReferenceObject> = {}

  for (const [headerName, headerConfig] of Object.entries(headers)) {
    if (
      headerConfig &&
      typeof headerConfig === 'object' &&
      '$ref' in headerConfig
    ) {
      // 这是一个ReferenceObject，直接使用
      processedHeaders[headerName] = headerConfig
    } else if (headerConfig && typeof headerConfig === 'object') {
      // 这是一个ZodHeaderObject，需要处理schema
      const zodHeader = headerConfig as ZodHeaderObject
      processedHeaders[headerName] = {
        ...zodHeader,
        schema: zodHeader.schema
          ? (toJSONSchema(zodHeader.schema) as SchemaObject)
          : undefined,
      }
    }
  }

  return Object.keys(processedHeaders).length > 0 ? processedHeaders : undefined
}

// 为了向后兼容，保留一个带contentType的扩展类型
interface ResponseConfigForOpenAPI extends SimplifiedZodResponseObject {
  contentType?: string
}

interface RouteSchema {
  path: string
  method: string
  response?: Partial<
    Record<StatusCode, ZodType | ResponseConfigForOpenAPI | ZodResponseObject>
  >
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
const globalDefaultResponses: Partial<Record<string, ZodType>> = {}

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

export function addGlobalResponse(statusCode: string, zodSchema: ZodType) {
  globalDefaultResponses[statusCode] = zodSchema
}

// 辅助函数：判断是否为ResponseConfigForOpenAPI
function isResponseConfigForOpenAPI(
  obj: unknown,
): obj is ResponseConfigForOpenAPI {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'description' in obj &&
    'schema' in obj &&
    !('content' in obj)
  )
}

export function buildResponses(
  schema: Partial<
    Record<StatusCode, ZodType | ResponseConfigForOpenAPI | ZodResponseObject>
  >,
  defaultContentType = 'application/json',
) {
  const responses: ResponsesObject = {}

  for (const [statusCode, responseConfig] of Object.entries(schema)) {
    if (isZodResponseObject(responseConfig)) {
      // 情况1: 完整的ResponseConfigWithContent，支持所有OpenAPI字段
      const content: Record<string, MediaTypeObject> = {}
      for (const [mediaType, mediaConfig] of Object.entries(
        responseConfig.content,
      )) {
        const jsonSchema = toJSONSchema(mediaConfig.schema) as SchemaObject
        content[mediaType] = {
          schema: jsonSchema,
          // 保留MediaTypeObject的其他字段
          example: mediaConfig.example,
          examples: mediaConfig.examples,
          encoding: mediaConfig.encoding,
          // 扩展字段
          ...Object.fromEntries(
            Object.entries(mediaConfig).filter(([key]) => key.startsWith('x-')),
          ),
        }
      }

      responses[statusCode] = {
        description:
          responseConfig.description || http.STATUS_CODES[statusCode] || '',
        content,
        // 保留ResponseObject的其他字段，处理headers中的zod schema
        headers: processHeaders(responseConfig.headers),
        links: responseConfig.links,
        // 扩展字段
        ...Object.fromEntries(
          Object.entries(responseConfig).filter(([key]) =>
            key.startsWith('x-'),
          ),
        ),
      }
    } else if (isResponseConfigForOpenAPI(responseConfig)) {
      // 情况2: ResponseConfig，包含MediaTypeObject的字段
      const jsonSchema = toJSONSchema(responseConfig.schema) as SchemaObject
      const contentType = responseConfig.contentType || defaultContentType

      responses[statusCode] = {
        description:
          responseConfig.description || http.STATUS_CODES[statusCode] || '',
        content: {
          [contentType]: {
            schema: jsonSchema,
            // 包含MediaTypeObject的其他字段
            example: responseConfig.example,
            examples: responseConfig.examples,
            encoding: responseConfig.encoding,
          },
        },
        // 保留ResponseObject的其他字段，处理headers中的zod schema
        headers: processHeaders(
          responseConfig.headers as Record<
            string,
            ZodHeaderObject | ReferenceObject
          >,
        ),
        links: responseConfig.links,
        // 扩展字段
        ...Object.fromEntries(
          Object.entries(responseConfig).filter(([key]) =>
            key.startsWith('x-'),
          ),
        ),
      }
    } else if (
      responseConfig &&
      typeof responseConfig === 'object' &&
      'schema' in responseConfig
    ) {
      // 这是从api.ts转换过来的ResponseConfig
      const config = responseConfig as unknown as ResponseConfigForOpenAPI
      const jsonSchema = toJSONSchema(config.schema) as SchemaObject
      const contentType = config.contentType || defaultContentType

      responses[statusCode] = {
        description: config.description || http.STATUS_CODES[statusCode] || '',
        content: {
          [contentType]: {
            schema: jsonSchema,
            example: config.example,
            examples: config.examples,
            encoding: config.encoding,
          },
        },
        headers: processHeaders(config.headers),
        links: config.links,
        ...Object.fromEntries(
          Object.entries(config).filter(([key]) => key.startsWith('x-')),
        ),
      }
    } else {
      // 情况3: 直接的ZodType (向后兼容)
      const jsonSchema = toJSONSchema(responseConfig) as SchemaObject
      const description = http.STATUS_CODES[statusCode] || ''

      responses[statusCode] = {
        description,
        content: {
          [defaultContentType]: {
            schema: jsonSchema,
          },
        },
      }
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

      const mergedResponses = {
        ...globalDefaultResponses,
        ...route.response,
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
