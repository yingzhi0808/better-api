import http from 'node:http'
import type { StatusCode } from 'hono/utils/http-status'
import {
  toJSONSchema,
  type ZodArray,
  type ZodFile,
  type ZodObject,
  type ZodType,
} from 'zod'
import type { HttpMethod, ParameterIn } from '@/types/common'
import type {
  ExampleObject,
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

interface RouteSchema {
  path: string
  method: string
  response?: Partial<Record<StatusCode, ZodType>>
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

export function generateResponsesObject(
  schema: Partial<Record<StatusCode, ZodType>>,
  contentType: string = 'application/json',
) {
  const responses: ResponsesObject = {}

  for (const [statusCode, zodSchema] of Object.entries(schema)) {
    const jsonSchema = toJSONSchema(zodSchema)
    const description =
      (jsonSchema.responseDescription as string) ||
      http.STATUS_CODES[statusCode] ||
      ''

    delete jsonSchema.responseDescription

    responses[statusCode] = {
      description,
      content: {
        [contentType]: {
          schema: jsonSchema as SchemaObject,
        },
      },
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
  body?: ZodType,
  contentTypes = ['application/json'],
  fileFields: string[] = [],
): RequestBodyObject | undefined {

  if (!body) {
    return undefined
  }
  const schema = toJSONSchema(body) as SchemaObject
  console.log(schema);

  if (contentTypes?.includes('multipart/form-data')) {
    const record = schema as unknown as {
      properties?: Record<string, SchemaObject>
    }
    const props = record.properties
    if (props && fileFields?.length) {
      for (const key of fileFields) {
        const target = props[key]
        if (target) {
          target.type = 'string'
          ;(target as { format?: string }).format = 'binary'
        }
      }
    }
  }
  const content: Record<string, MediaTypeObject> = {}
  for (const ct of contentTypes ?? ['application/json']) {
    content[ct] = { schema }
  }
  return { content }
}

export function generateOpenAPI() {
  const paths: PathsObject = {}

  for (const route of globalRouteSchemas) {
    if (!paths[route.path]) {
      paths[route.path] = {}
    }

    const method = route.method.toLowerCase() as HttpMethod
    if (!paths[route.path][method]) {
      const parameters: ParameterObject[] = [
        ...buildParametersFromObject('path', route.params),
        ...buildParametersFromObject('query', route.query),
        ...buildParametersFromObject('header', route.headers),
        ...buildParametersFromObject('cookie', route.cookies),
      ]

      const requestBody = buildRequestBody(route.body)

      const mergedResponses: Partial<Record<StatusCode, ZodType>> = {
        ...(globalDefaultResponses as Partial<Record<StatusCode, ZodType>>),
        ...route.response,
      }

      const operation: OperationObject = {
        responses: generateResponsesObject(mergedResponses),
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
      if (parameters.length) {
        operation.parameters = parameters
      }
      if (requestBody) {
        operation.requestBody = requestBody
      }
      paths[route.path][method] = operation
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
