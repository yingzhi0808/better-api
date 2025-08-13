/** biome-ignore-all lint/suspicious/noExplicitAny: any is used for extension */

import type { JsonSchemaDraft202012Object } from '@hyperjump/json-schema/draft-2020-12'
import type { ParameterIn, ParameterStyle } from './common'

/**
 * This is the root object of the [OpenAPI Description](https://spec.openapis.org/oas/v3.1.1#openapi-description).
 * @see https://spec.openapis.org/oas/v3.1.1#openapi-object
 *
 * @category Types
 */
export interface OpenAPIObject {
  /**
   * **REQUIRED**. This string MUST be the version number of the OpenAPI Specification that the OpenAPI Document
   * uses. The `openapi` field SHOULD be used by tooling to interpret the OpenAPI Document. This is _not_ related
   * to the API [`info.version`](https://spec.openapis.org/oas/v3.1.1#info-version) string.
   */
  openapi: '3.1.0' | '3.1.1'

  /**
   * **REQUIRED**. Provides metadata about the API. The metadata MAY be used by tooling as required.
   */
  info: InfoObject

  /**
   * The default value for the `$schema` keyword within Schema Objects contained within this OAS document.
   * This MUST be in the form of a URI.
   */
  jsonSchemaDialect?: string

  /**
   * An array of Server Objects, which provide connectivity information to a target server. If the `servers` field
   * is not provided, or is an empty array, the default value would be a Server Object with a url value of `/`.
   */
  servers?: ServerObject[]

  /**
   * The available paths and operations for the API.
   */
  paths?: PathsObject

  /**
   * The incoming webhooks that MAY be received as part of this API and that the API consumer MAY choose to
   * implement. Closely related to the `callbacks` feature, this section describes requests initiated other than by
   * an API call, for example by an out of band registration. The key name is a unique string to refer to each
   * webhook, while the (optionally referenced) Path Item Object describes a request that may be initiated by the
   * API provider and the expected responses.
   */
  webhooks?: Record<string, PathItemObject>

  /**
   * An element to hold various Objects for the OpenAPI Description.
   */
  components?: ComponentsObject

  /**
   * A declaration of which security mechanisms can be used across the API. The list of values includes alternative
   * Security Requirement Objects that can be used. Only one of the Security Requirement Objects need to be
   * satisfied to authorize a request. Individual operations can override this definition. The list can be
   * incomplete, up to being empty or absent. To make security explicitly optional, an empty security requirement
   * (`{}`) can be included in the array.
   */
  security?: SecurityRequirementObject[]

  /**
   * A list of tags used by the OpenAPI Description with additional metadata. The order of the tags can be used to
   * reflect on their order by the parsing tools. Not all tags that are used by the Operation Object must be
   * declared. The tags that are not declared MAY be organized randomly or based on the tools' logic. Each tag name
   * in the list MUST be unique.
   */
  tags?: TagObject[]

  /**
   * Additional external documentation.
   */
  externalDocs?: ExternalDocumentationObject

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * The object provides metadata about the API. The metadata MAY be used by the clients if needed, and MAY be
 * presented in editing or documentation generation tools for convenience.
 * @see https://spec.openapis.org/oas/v3.1.1#info-object
 *
 * @category Types
 */
export interface InfoObject {
  /**
   * **REQUIRED**. The title of the API.
   */
  title: string

  /**
   * A short summary of the API.
   */
  summary?: string

  /**
   * A description of the API. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * A URI for the Terms of Service for the API. This MUST be in the form of a URI.
   */
  termsOfService?: string

  /**
   * The contact information for the exposed API.
   */
  contact?: ContactObject

  /**
   * The license information for the exposed API.
   */
  license?: LicenseObject

  /**
   * **REQUIRED**. The version of the OpenAPI Document (which is distinct from the OpenAPI Specification version or
   * the version of the API being described or the version of the OpenAPI Description).
   */
  version: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Contact information for the exposed API.
 * @see https://spec.openapis.org/oas/v3.1.1#contact-object
 *
 * @category Types
 */
export interface ContactObject {
  /**
   * The identifying name of the contact person/organization.
   */
  name?: string

  /**
   * The URI for the contact information. This MUST be in the form of a URI.
   */
  url?: string

  /**
   * The email address of the contact person/organization. This MUST be in the form of an email address.
   */
  email?: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * License information for the exposed API.
 * @see https://spec.openapis.org/oas/v3.1.1#license-object
 *
 * @category Types
 */
export interface LicenseObject {
  /**
   * **REQUIRED**. The license name used for the API.
   */
  name: string

  /**
   * An SPDX license expression for the API. The `identifier` field is mutually exclusive of the `url` field.
   */
  identifier?: string

  /**
   * A URI for the license used for the API. This MUST be in the form of a URI. The `url` field is mutually
   * exclusive of the `identifier` field.
   */
  url?: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * An object representing a Server.
 * @see https://spec.openapis.org/oas/v3.1.1#server-object
 *
 * @category Types
 */
export interface ServerObject {
  /**
   * **REQUIRED**. A URL to the target host. This URL supports Server Variables and MAY be relative, to indicate
   * that the host location is relative to the location where the document containing the Server Object is being
   * served. Variable substitutions will be made when a variable is named in `{`braces`}`.
   */
  url: string

  /**
   * An optional string describing the host designated by the URL. CommonMark syntax MAY be used for rich text
   * representation.
   */
  description?: string

  /**
   * A map between a variable name and its value. The value is used for substitution in the server's URL template.
   */
  variables?: Record<string, ServerVariableObject>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * An object representing a Server Variable for server URL template substitution.
 * @see https://spec.openapis.org/oas/v3.1.1#server-variable-object
 *
 * @category Types
 */
export interface ServerVariableObject {
  /**
   * An enumeration of string values to be used if the substitution options are from a limited set. The array MUST
   * NOT be empty.
   */
  enum?: string[]

  /**
   * **REQUIRED**. The default value to use for substitution, which SHALL be sent if an alternate value is _not_
   * supplied. If the [`enum`](https://spec.openapis.org/oas/v3.1.1#server-variable-enum) is defined, the value MUST exist in the enum's values. Note
   * that this behavior is different from the Schema Object's `default` keyword, which documents the receiver's
   * behavior rather than inserting the value into the data.
   */
  default: string

  /**
   * An optional description for the server variable. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Holds a set of reusable objects for different aspects of the OAS. All objects defined within the Components
 * Object will have no effect on the API unless they are explicitly referenced from outside the Components Object.
 * @see https://spec.openapis.org/oas/v3.1.1#components-object
 *
 * @category Types
 */
export interface ComponentsObject {
  /**
   * An object to hold reusable Schema Objects.
   */
  schemas?: Record<string, SchemaObject | boolean>

  /**
   * An object to hold reusable Response Objects.
   */
  responses?: Record<string, ResponseObject | ReferenceObject>

  /**
   * An object to hold reusable Parameter Objects.
   */
  parameters?: Record<string, ParameterObject | ReferenceObject>

  /**
   * An object to hold reusable Example Objects.
   */
  examples?: Record<string, ExampleObject | ReferenceObject>

  /**
   * An object to hold reusable Request Body Objects.
   */
  requestBodies?: Record<string, RequestBodyObject | ReferenceObject>

  /**
   * An object to hold reusable Header Objects.
   */
  headers?: Record<string, HeaderObject | ReferenceObject>

  /**
   * An object to hold reusable Security Scheme Objects.
   */
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>

  /**
   * An object to hold reusable Link Objects.
   */
  links?: Record<string, LinkObject | ReferenceObject>

  /**
   * An object to hold reusable Callback Objects.
   */
  callbacks?: Record<string, CallbackObject | ReferenceObject>

  /**
   * An object to hold reusable Path Item Objects.
   */
  pathItems?: Record<string, PathItemObject>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Holds the relative paths to the individual endpoints and their operations. The path is appended to the URL from
 * the Server Object in order to construct the full URL. The Paths Object MAY be empty, due to Access Control List
 * (ACL) constraints.
 * @see https://spec.openapis.org/oas/v3.1.1#paths-object
 *
 * @category Types
 */
export interface PathsObject {
  /**
   * A relative path to an individual endpoint. The field name MUST begin with a forward slash (`/`). The path is
   * **appended** (no relative URL resolution) to the expanded URL from the Server Object's `url` field in order to
   * construct the full URL. Path templating is allowed. When matching URLs, concrete (non-templated) paths would be
   * matched before their templated counterparts. Templated paths with the same hierarchy but different templated
   * names MUST NOT exist as they are identical. In case of ambiguous matching, it's up to the tooling to decide
   * which one to use.
   */
  [path: string]: PathItemObject

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Describes the operations available on a single path. A Path Item MAY be empty, due to ACL constraints. The path
 * itself is still exposed to the documentation viewer but they will not know which operations and parameters are
 * available.
 * @see https://spec.openapis.org/oas/v3.1.1#path-item-object
 *
 * @category Types
 */
export interface PathItemObject {
  /**
   * Allows for a referenced definition of this path item. The value MUST be in the form of a URI, and the
   * referenced structure MUST be in the form of a Path Item Object. In case a Path Item Object field appears both
   * in the defined object and the referenced object, the behavior is undefined. See the rules for resolving
   * Relative References.
   */
  $ref?: string

  /**
   * An optional string summary, intended to apply to all operations in this path.
   */
  summary?: string

  /**
   * An optional string description, intended to apply to all operations in this path. CommonMark syntax MAY be used
   * for rich text representation.
   */
  description?: string

  /**
   * A definition of a GET operation on this path.
   */
  get?: OperationObject

  /**
   * A definition of a PUT operation on this path.
   */
  put?: OperationObject

  /**
   * A definition of a POST operation on this path.
   */
  post?: OperationObject

  /**
   * A definition of a DELETE operation on this path.
   */
  delete?: OperationObject

  /**
   * A definition of a OPTIONS operation on this path.
   */
  options?: OperationObject

  /**
   * A definition of a HEAD operation on this path.
   */
  head?: OperationObject

  /**
   * A definition of a PATCH operation on this path.
   */
  patch?: OperationObject

  /**
   * A definition of a TRACE operation on this path.
   */
  trace?: OperationObject

  /**
   * An alternative `servers` array to service all operations in this path. If a `servers` array is specified at
   * the OpenAPI Object level, it will be overridden by this value.
   */
  servers?: ServerObject[]

  /**
   * A list of parameters that are applicable for all the operations described under this path. These parameters
   * can be overridden at the operation level, but cannot be removed there. The list MUST NOT include duplicated
   * parameters. A unique parameter is defined by a combination of a name and location. The list can use the
   * Reference Object to link to parameters that are defined in the OpenAPI Object's `components.parameters`.
   */
  parameters?: (ParameterObject | ReferenceObject)[]

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Describes a single API operation on a path.
 * @see https://spec.openapis.org/oas/v3.1.1#operation-object
 *
 * @category Types
 */
export interface OperationObject {
  /**
   * A list of tags for API documentation control. Tags can be used for logical grouping of operations by resources
   * or any other qualifier.
   */
  tags?: string[]

  /**
   * A short summary of what the operation does.
   */
  summary?: string

  /**
   * A verbose explanation of the operation behavior. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * Additional external documentation for this operation.
   */
  externalDocs?: ExternalDocumentationObject

  /**
   * Unique string used to identify the operation. The id MUST be unique among all operations described in the API.
   * The operationId value is **case-sensitive**. Tools and libraries MAY use the operationId to uniquely identify
   * an operation, therefore, it is RECOMMENDED to follow common programming naming conventions.
   */
  operationId?: string

  /**
   * A list of parameters that are applicable for this operation. If a parameter is already defined at the Path
   * Item, the new definition will override it but can never remove it. The list MUST NOT include duplicated
   * parameters. A unique parameter is defined by a combination of a name and location. The list can use the
   * Reference Object to link to parameters that are defined in the OpenAPI Object's `components.parameters`.
   */
  parameters?: (ParameterObject | ReferenceObject)[]

  /**
   * The request body applicable for this operation. The `requestBody` is fully supported in HTTP methods where the
   * HTTP 1.1 specification RFC7231 has explicitly defined semantics for request bodies. In other cases where the
   * HTTP spec is vague (such as GET, HEAD and DELETE), `requestBody` is permitted but does not have well-defined
   * semantics and SHOULD be avoided if possible.
   */
  requestBody?: RequestBodyObject | ReferenceObject

  /**
   * The list of possible responses as they are returned from executing this operation.
   */
  responses: ResponsesObject

  /**
   * A map of possible out-of band callbacks related to the parent operation. The key is a unique identifier for
   * the Callback Object. Each value in the map is a Callback Object that describes a request that may be initiated
   * by the API provider and the expected responses.
   */
  callbacks?: Record<string, CallbackObject | ReferenceObject>

  /**
   * Declares this operation to be deprecated. Consumers SHOULD refrain from usage of the declared operation.
   * Default value is `false`.
   */
  deprecated?: boolean

  /**
   * A declaration of which security mechanisms can be used for this operation. The list of values includes
   * alternative Security Requirement Objects that can be used. Only one of the Security Requirement Objects need
   * to be satisfied to authorize a request. To make security optional, an empty security requirement (`{}`) can be
   * included in the array. This definition overrides any declared top-level [`security`](https://spec.openapis.org/oas/v3.1.1#oas-security). To remove
   * a top-level security declaration, an empty array can be used.
   */
  security?: SecurityRequirementObject[]

  /**
   * An alternative `servers` array to service this operation. If a `servers` array is specified at the Path Item
   * Object or OpenAPI Object level, it will be overridden by this value.
   */
  servers?: ServerObject[]

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Allows referencing an external resource for extended documentation.
 * @see https://spec.openapis.org/oas/v3.1.1#external-documentation-object
 *
 * @category Types
 */
export interface ExternalDocumentationObject {
  /**
   * A description of the target documentation. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * **REQUIRED**. The URI for the target documentation. This MUST be in the form of a URI.
   */
  url: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Describes a single operation parameter. A unique parameter is defined by a combination of a name and location.
 * @see https://spec.openapis.org/oas/v3.1.1#parameter-object
 *
 * @category Types
 */
export interface ParameterObject {
  /**
   * **REQUIRED**. The name of the parameter. Parameter names are _case sensitive_.
   * - If [`in`](https://spec.openapis.org/oas/v3.1.1#parameter-in) is `"path"`, the `name` field MUST correspond to a template expression occurring
   *   within the [path](#paths-path) field in the [Paths Object](https://spec.openapis.org/oas/v3.1.1#paths-object). See [Path Templating](https://spec.openapis.org/oas/v3.1.1#path-templating)
   *   for further information.
   * - If [`in`](https://spec.openapis.org/oas/v3.1.1#parameter-in) is `"header"` and the `name` field is `"Accept"`, `"Content-Type"` or `"Authorization"`,
   *   the parameter definition SHALL be ignored.
   * - For all other cases, the `name` corresponds to the parameter name used by the [`in`](https://spec.openapis.org/oas/v3.1.1#parameter-in) field.
   */
  name: string

  /**
   * **REQUIRED**. The location of the parameter. Possible values are `"query"`, `"header"`, `"path"` or `"cookie"`.
   */
  in: ParameterIn

  /**
   * A brief description of the parameter. This could contain examples of use. CommonMark syntax MAY be used for rich
   * text representation.
   */
  description?: string

  /**
   * Determines whether this parameter is mandatory. If the [parameter location](#parameter-in) is `"path"`, this
   * field is **REQUIRED** and its value MUST be `true`. Otherwise, the field MAY be included and its default value
   * is `false`.
   */
  required?: boolean

  /**
   * Specifies that a parameter is deprecated and SHOULD be transitioned out of usage. Default value is `false`.
   */
  deprecated?: boolean

  /**
   * If `true`, clients MAY pass a zero-length string value in place of parameters that would otherwise be omitted
   * entirely, which the server SHOULD interpret as the parameter being unused. Default value is `false`. If
   * [`style`](https://spec.openapis.org/oas/v3.1.1#parameter-style) is used, and if [behavior is _n/a_ (cannot be serialized)](#style-examples), the
   * value of `allowEmptyValue` SHALL be ignored. Interactions between this field and the parameter's [Schema Object]
   * (https://spec.openapis.org/oas/v3.1.1#schema-object) are implementation-defined. This field is valid only for `query` parameters. Use of this field
   * is NOT RECOMMENDED, and it is likely to be removed in a later revision.
   */
  allowEmptyValue?: boolean

  /**
   * Describes how the parameter value will be serialized depending on the type of the parameter value. Default
   * values (based on value of `in`): for `"query"` - `"form"`; for `"path"` - `"simple"`; for `"header"` -
   * `"simple"`; for `"cookie"` - `"form"`.
   */
  style?: ParameterStyle

  /**
   * When this is true, parameter values of type `array` or `object` generate separate parameters for each value of
   * the array or key-value pair of the map. For other types of parameters this field has no effect. When
   * [`style`](https://spec.openapis.org/oas/v3.1.1#parameter-style) is `"form"`, the default value is `true`. For all other styles, the default value
   * is `false`. Note that despite `false` being the default for `deepObject`, the combination of `false` with
   * `deepObject` is undefined.
   */
  explode?: boolean

  /**
   * When this is true, parameter values are serialized using reserved expansion, as defined by RFC6570, which allows
   * RFC3986's reserved character set, as well as percent-encoded triples, to pass through unchanged, while still
   * percent-encoding all other disallowed characters (including `%` outside of percent-encoded triples). Applications
   * are still responsible for percent-encoding reserved characters that are not allowed in the query string (`[`,
   * `]`, `#`), or have a special meaning in `application/x-www-form-urlencoded` (`-`, `&`, `+`); see Appendices C
   * and E for details. This field only applies to parameters with an `in` value of `query`. The default value
   * is `false`.
   */
  allowReserved?: boolean

  /**
   * The schema defining the type used for the parameter.
   */
  schema?: SchemaObject | boolean

  /**
   * Example of the parameter's potential value; see [Working With Examples](https://spec.openapis.org/oas/v3.1.1#working-with-examples).
   */
  example?: any

  /**
   * Examples of the parameter's potential value; see [Working With Examples](https://spec.openapis.org/oas/v3.1.1#working-with-examples).
   */
  examples?: Record<string, ExampleObject | ReferenceObject>

  /**
   * A map containing the representations for the parameter. The key is the media type and the value describes it.
   * The map MUST only contain one entry.
   */
  content?: Record<string, MediaTypeObject>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Describes a single request body.
 * @see https://spec.openapis.org/oas/v3.1.1#request-body-object
 *
 * @category Types
 */
export interface RequestBodyObject {
  /**
   * A brief description of the request body. This could contain examples of use. CommonMark syntax MAY be used for
   * rich text representation.
   */
  description?: string

  /**
   * **REQUIRED**. The content of the request body. The key is a media type or media type range and the value
   * describes it. For requests that match multiple keys, only the most specific key is applicable. e.g.
   * `"text/plain"` overrides `"text/*"`
   */
  content: Record<string, MediaTypeObject>

  /**
   * Determines if the request body is required in the request. Defaults to `false`.
   */
  required?: boolean

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Each Media Type Object provides schema and examples for the media type identified by its key.
 * @see https://spec.openapis.org/oas/v3.1.1#media-type-object
 *
 * @category Types
 */
export interface MediaTypeObject {
  /**
   * The schema defining the content of the request, response, parameter, or header.
   */
  schema?: SchemaObject | boolean

  /**
   * Example of the media type; see [Working With Examples](https://spec.openapis.org/oas/v3.1.1#working-with-examples).
   */
  example?: any

  /**
   * Examples of the media type; see [Working With Examples](https://spec.openapis.org/oas/v3.1.1#working-with-examples).
   */
  examples?: Record<string, ExampleObject | ReferenceObject>

  /**
   * A map between a property name and its encoding information. The key, being the property name, MUST exist in the
   * schema as a property. The `encoding` field SHALL only apply to Request Body Objects, and only when the media
   * type is `multipart` or `application/x-www-form-urlencoded`. If no Encoding Object is provided for a property,
   * the behavior is determined by the default values documented for the Encoding Object.
   */
  encoding?: Record<string, EncodingObject>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * A single encoding definition applied to a single schema property.
 * @see https://spec.openapis.org/oas/v3.1.1#encoding-object
 *
 * @category Types
 */
export interface EncodingObject {
  /**
   * The `Content-Type` for encoding a specific property. The value is a comma-separated list, each element of which
   * is either a specific media type (e.g. `image/png`) or a wildcard media type (e.g. `image/*`). Default value
   * depends on the property type as shown in the table below.
   */
  contentType?: string

  /**
   * A map allowing additional information to be provided as headers. `Content-Type` is described separately and SHALL
   * be ignored in this section. This field SHALL be ignored if the request body media type is not a `multipart`.
   */
  headers?: Record<string, HeaderObject | ReferenceObject>

  /**
   * Describes how a specific property value will be serialized depending on its type. See Parameter Object for
   * details on the [`style`](https://spec.openapis.org/oas/v3.1.1#parameter-style) field. The behavior follows the same values as `query` parameters,
   * including default values. Note that the initial `?` used in query strings is not used in
   * `application/x-www-form-urlencoded` message bodies, and MUST be removed (if using an RFC6570 implementation) or
   * simply not added (if constructing the string manually). This field SHALL be ignored if the request body media
   * type is not `application/x-www-form-urlencoded` or `multipart/form-data`. If a value is explicitly defined, then
   * the value of [`contentType`](https://spec.openapis.org/oas/v3.1.1#encoding-content-type) (implicit or explicit) SHALL be ignored.
   */
  style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'

  /**
   * When this is true, property values of type `array` or `object` generate separate parameters for each value of
   * the array, or key-value-pair of the map. For other types of properties this field has no effect. When
   * [`style`](https://spec.openapis.org/oas/v3.1.1#encoding-style) is `"form"`, the default value is `true`. For all other styles, the default value
   * is `false`. Note that despite `false` being the default for `deepObject`, the combination of `false` with
   * `deepObject` is undefined. This field SHALL be ignored if the request body media type is not
   * `application/x-www-form-urlencoded` or `multipart/form-data`. If a value is explicitly defined, then the value
   * of [`contentType`](https://spec.openapis.org/oas/v3.1.1#encoding-content-type) (implicit or explicit) SHALL be ignored.
   */
  explode?: boolean

  /**
   * When this is true, parameter values are serialized using reserved expansion, as defined by RFC6570, which allows
   * RFC3986's reserved character set, as well as percent-encoded triples, to pass through unchanged, while still
   * percent-encoding all other disallowed characters (including `%` outside of percent-encoded triples). Applications
   * are still responsible for percent-encoding reserved characters that are not allowed in the query string (`[`,
   * `]`, `#`), or have a special meaning in `application/x-www-form-urlencoded` (`-`, `&`, `+`); see Appendices C
   * and E for details. The default value is `false`. This field SHALL be ignored if the request body media type is
   * not `application/x-www-form-urlencoded` or `multipart/form-data`. If a value is explicitly defined, then the
   * value of [`contentType`](https://spec.openapis.org/oas/v3.1.1#encoding-content-type) (implicit or explicit) SHALL be ignored.
   */
  allowReserved?: boolean

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * A container for the expected responses of an operation. The container maps a HTTP response code to the expected
 * response.
 * @see https://spec.openapis.org/oas/v3.1.1#responses-object
 *
 * @category Types
 */
export interface ResponsesObject {
  /**
   * The documentation of responses other than the ones declared for specific HTTP response codes. Use this field to
   * cover undeclared responses.
   */
  default?: ResponseObject | ReferenceObject

  /**
   * Any HTTP status code can be used as the property name, but only one property per code, to describe the expected
   * response for that HTTP status code. This field MUST be enclosed in quotation marks (for example, "200") for
   * compatibility between JSON and YAML. To define a range of response codes, this field MAY contain the uppercase
   * wildcard character `X`. For example, `2XX` represents all response codes between `200` and `299`. Only the
   * following range definitions are allowed: `1XX`, `2XX`, `3XX`, `4XX`, and `5XX`. If a response is defined using
   * an explicit code, the explicit code definition takes precedence over the range definition for that code.
   */
  [statusCode: string]: ResponseObject | ReferenceObject | undefined

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Describes a single response from an API operation, including design-time, static `links` to operations based on
 * the response.
 * @see https://spec.openapis.org/oas/v3.1.1#response-object
 *
 * @category Types
 */
export interface ResponseObject {
  /**
   * **REQUIRED**. A description of the response. CommonMark syntax MAY be used for rich text representation.
   */
  description: string

  /**
   * Maps a header name to its definition. RFC7230 states header names are case insensitive. If a response header is
   * defined with the name `"Content-Type"`, it SHALL be ignored.
   */
  headers?: Record<string, HeaderObject | ReferenceObject>

  /**
   * A map containing descriptions of potential response payloads. The key is a media type or media type range and
   * the value describes it. For responses that match multiple keys, only the most specific key is applicable. e.g.
   * `"text/plain"` overrides `"text/*"`
   */
  content?: Record<string, MediaTypeObject>

  /**
   * A map of operations links that can be followed from the response. The key of the map is a short name for the
   * link, following the naming constraints of the names for Component Objects.
   */
  links?: Record<string, LinkObject | ReferenceObject>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * A map of possible out-of band callbacks related to the parent operation. Each value in the map is a Path Item
 * Object that describes a set of requests that may be initiated by the API provider and the expected responses. The
 * key value used to identify the Path Item Object is an expression, evaluated at runtime, that identifies a URL to
 * use for the callback operation.
 * @see https://spec.openapis.org/oas/v3.1.1#callback-object
 *
 * @category Types
 */
export interface CallbackObject {
  /**
   * A Path Item Object used to define a callback request and expected responses. A complete example is available.
   */
  [expression: string]: PathItemObject

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * An object grouping an internal or external example value with basic `summary` and `description` metadata. This
 * object is typically used in fields named `examples` (plural), and is a referenceable alternative to older
 * `example` (singular) fields that do not support referencing or metadata.
 * @see https://spec.openapis.org/oas/v3.1.1#example-object
 *
 * @category Types
 */
export interface ExampleObject {
  /**
   * Short description for the example.
   */
  summary?: string

  /**
   * Long description for the example. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * Embedded literal example. The `value` field and `externalValue` field are mutually exclusive. To represent
   * examples of media types that cannot naturally represented in JSON or YAML, use a string value to contain the
   * example, escaping where necessary.
   */
  value?: any

  /**
   * A URI that identifies the literal example. This provides the capability to reference examples that cannot easily
   * be included in JSON or YAML documents. The `value` field and `externalValue` field are mutually exclusive. See
   * the rules for resolving Relative References.
   */
  externalValue?: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * The Link Object represents a possible design-time link for a response. The presence of a link does not guarantee
 * the caller's ability to successfully invoke it, rather it provides a known relationship and traversal mechanism
 * between responses and other operations.
 * @see https://spec.openapis.org/oas/v3.1.1#link-object
 *
 * @category Types
 */
export interface LinkObject {
  /**
   * A URI reference to an OAS operation. This field is mutually exclusive of the `operationId` field, and MUST
   * point to an Operation Object. Relative `operationRef` values MAY be used to locate an existing Operation Object
   * in the OpenAPI Description.
   */
  operationRef?: string

  /**
   * The name of an _existing_, resolvable OAS operation, as defined with a unique `operationId`. This field is
   * mutually exclusive of the `operationRef` field.
   */
  operationId?: string

  /**
   * A map representing parameters to pass to an operation as specified with `operationId` or identified via
   * `operationRef`. The key is the parameter name to be used (optionally qualified with the parameter location, e.g.
   * `path.id` for an `id` parameter in the path), whereas the value can be a constant or an expression to be
   * evaluated and passed to the linked operation.
   */
  parameters?: Record<string, any | string>

  /**
   * A literal value or expression to use as a request body when calling the target operation.
   */
  requestBody?: any | string

  /**
   * A description of the link. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * A server object to be used by the target operation.
   */
  server?: ServerObject

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Describes a single header for HTTP responses and for individual parts in `multipart` representations; see the
 * relevant Response Object and Encoding Object documentation for restrictions on which headers can be described.
 * @see https://spec.openapis.org/oas/v3.1.1#header-object
 *
 * @category Types
 */
export interface HeaderObject {
  /**
   * A brief description of the header. This could contain examples of use. CommonMark syntax MAY be used for rich
   * text representation.
   */
  description?: string

  /**
   * Determines whether this header is mandatory. The default value is `false`.
   */
  required?: boolean

  /**
   * Specifies that the header is deprecated and SHOULD be transitioned out of usage. Default value is `false`.
   */
  deprecated?: boolean

  /**
   * Describes how the header value will be serialized. The default (and only legal value for headers) is `"simple"`.
   */
  style?: 'simple'

  /**
   * When this is true, header values of type `array` or `object` generate a single header whose value is a
   * comma-separated list of the array items or key-value pairs of the map, see Style Examples. For other data types
   * this field has no effect. The default value is `false`.
   */
  explode?: boolean

  /**
   * The schema defining the type used for the header.
   */
  schema?: SchemaObject | ReferenceObject | boolean

  /**
   * Example of the header's potential value; see [Working With Examples](https://spec.openapis.org/oas/v3.1.1#working-with-examples).
   */
  example?: any

  /**
   * Examples of the header's potential value; see [Working With Examples](https://spec.openapis.org/oas/v3.1.1#working-with-examples).
   */
  examples?: Record<string, ExampleObject | ReferenceObject>

  /**
   * A map containing the representations for the header. The key is the media type and the value describes it. The
   * map MUST only contain one entry.
   */
  content?: Record<string, MediaTypeObject>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Adds metadata to a single tag that is used by the Operation Object. It is not mandatory to have a Tag Object per
 * tag defined in the Operation Object instances.
 * @see https://spec.openapis.org/oas/v3.1.1#tag-object
 *
 * @category Types
 */
export interface TagObject {
  /**
   * **REQUIRED**. The name of the tag.
   */
  name: string

  /**
   * A description for the tag. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * Additional external documentation for this tag.
   */
  externalDocs?: ExternalDocumentationObject

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * A simple object to allow referencing other components in the OpenAPI Description, internally and externally.
 * @see https://spec.openapis.org/oas/v3.1.1#reference-object
 *
 * @category Types
 */
export interface ReferenceObject {
  /**
   * **REQUIRED**. The reference identifier. This MUST be in the form of a URI.
   */
  $ref: string

  /**
   * A short summary which by default SHOULD override that of the referenced component. If the referenced object-type
   * does not allow a `summary` field, then this field has no effect.
   */
  summary?: string

  /**
   * A description which by default SHOULD override that of the referenced component. CommonMark syntax MAY be used
   * for rich text representation. If the referenced object-type does not allow a `description` field, then this
   * field has no effect.
   */
  description?: string
}

/**
 * The Schema Object allows the definition of input and output data types. These types can be objects, but also
 * primitives and arrays. This object is a superset of the JSON Schema Specification Draft 2020-12. The empty schema
 * (which allows any instance to validate) MAY be represented by the boolean value `true` and a schema which allows
 * no instance to validate MAY be represented by the boolean value `false`.
 * @see https://spec.openapis.org/oas/v3.1.1#schema-object
 *
 * @category Types
 */
export interface SchemaObject
  extends Omit<JsonSchemaDraft202012Object, '$schema'> {
  $schema?: string
  /**
   * Adds support for polymorphism. The discriminator is used to determine which of a set of schemas a payload is
   * expected to satisfy. See Composition and Inheritance for more details.
   */
  discriminator?: DiscriminatorObject

  /**
   * This MAY be used only on property schemas. It has no effect on root schemas. Adds additional metadata to
   * describe the XML representation of this property.
   */
  xml?: XMLObject

  /**
   * Additional external documentation for this schema.
   */
  externalDocs?: ExternalDocumentationObject

  /**
   * A free-form field to include an example of an instance for this schema. To represent examples that cannot be
   * naturally represented in JSON or YAML, a string value can be used to contain the example with escaping where
   * necessary.
   *
   * **Deprecated:** The `example` field has been deprecated in favor of the JSON Schema `examples` keyword. Use of
   * `example` is discouraged, and later versions of this specification may remove it.
   */
  example?: any

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * When request bodies or response payloads may be one of a number of different schemas, a Discriminator Object gives
 * a hint about the expected schema of the document. This hint can be used to aid in serialization, deserialization,
 * and validation. The Discriminator Object does this by implicitly or explicitly associating the possible values of
 * a named property with alternative schemas.
 * @see https://spec.openapis.org/oas/v3.1.1#discriminator-object
 *
 * @category Types
 */
export interface DiscriminatorObject {
  /**
   * **REQUIRED**. The name of the property in the payload that will hold the discriminating value. This property
   * SHOULD be required in the payload schema, as the behavior when the property is absent is undefined.
   */
  propertyName: string

  /**
   * An object to hold mappings between payload values and schema names or URI references.
   */
  mapping?: Record<string, string>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * A metadata object that allows for more fine-tuned XML model definitions.
 * @see https://spec.openapis.org/oas/v3.1.1#xml-object
 *
 * @category Types
 */
export interface XMLObject {
  /**
   * Replaces the name of the element/attribute used for the described schema property. When defined within `items`,
   * it will affect the name of the individual XML elements within the list. When defined alongside `type` being
   * `"array"` (outside the `items`), it will affect the wrapping element if and only if `wrapped` is `true`. If
   * `wrapped` is `false`, it will be ignored.
   */
  name?: string

  /**
   * The URI of the namespace definition. Value MUST be in the form of a non-relative URI.
   */
  namespace?: string

  /**
   * The prefix to be used for the name.
   */
  prefix?: string

  /**
   * Declares whether the property definition translates to an attribute instead of an element. Default value is
   * `false`.
   */
  attribute?: boolean

  /**
   * MAY be used only for an array definition. Signifies whether the array is wrapped (for example,
   * `<books><book/><book/></books>`) or unwrapped (`<book/><book/>`). Default value is `false`. The definition takes
   * effect only when defined alongside `type` being `"array"` (outside the `items`).
   */
  wrapped?: boolean

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Defines a security scheme that can be used by the operations.
 * @see https://spec.openapis.org/oas/v3.1.1#security-scheme-object
 *
 * @category Types
 */
export interface SecuritySchemeObject {
  /**
   * **REQUIRED**. The type of the security scheme. Valid values are `"apiKey"`, `"http"`, `"mutualTLS"`, `"oauth2"`,
   * `"openIdConnect"`.
   */
  type: 'apiKey' | 'http' | 'mutualTLS' | 'oauth2' | 'openIdConnect'

  /**
   * A description for security scheme. CommonMark syntax MAY be used for rich text representation.
   */
  description?: string

  /**
   * **REQUIRED**. The name of the header, query or cookie parameter to be used.
   * (Applies to: `apiKey`)
   */
  name?: string

  /**
   * **REQUIRED**. The location of the API key. Valid values are `"query"`, `"header"`, or `"cookie"`.
   * (Applies to: `apiKey`)
   */
  in?: 'query' | 'header' | 'cookie'

  /**
   * **REQUIRED**. The name of the HTTP Authentication scheme to be used in the Authorization header as defined in
   * RFC7235. The values used SHOULD be registered in the IANA Authentication Scheme registry. The value is
   * case-insensitive, as defined in RFC7235.
   * (Applies to: `http`)
   */
  scheme?: string

  /**
   * A hint to the client to identify how the bearer token is formatted. Bearer tokens are usually generated by an
   * authorization server, so this information is primarily for documentation purposes.
   * (Applies to: `http` (`"bearer"`))
   */
  bearerFormat?: string

  /**
   * **REQUIRED**. An object containing configuration information for the flow types supported.
   * (Applies to: `oauth2`)
   */
  flows?: OAuthFlowsObject

  /**
   * **REQUIRED**. Well-known URL to discover the OpenID Connect provider metadata.
   * (Applies to: `openIdConnect`)
   */
  openIdConnectUrl?: string

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Allows configuration of the supported OAuth Flows.
 * @see https://spec.openapis.org/oas/v3.1.1#oauth-flows-object
 *
 * @category Types
 */
export interface OAuthFlowsObject {
  /**
   * Configuration for the OAuth Implicit flow
   */
  implicit?: OAuthFlowObject

  /**
   * Configuration for the OAuth Resource Owner Password flow
   */
  password?: OAuthFlowObject

  /**
   * Configuration for the OAuth Client Credentials flow. Previously called `application` in OpenAPI 2.0.
   */
  clientCredentials?: OAuthFlowObject

  /**
   * Configuration for the OAuth Authorization Code flow. Previously called `accessCode` in OpenAPI 2.0.
   */
  authorizationCode?: OAuthFlowObject

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Configuration details for a supported OAuth Flow
 * @see https://spec.openapis.org/oas/v3.1.1#oauth-flow-object
 *
 * @category Types
 */
export interface OAuthFlowObject {
  /**
   * **REQUIRED**. The authorization URL to be used for this flow. This MUST be in the form of a URL. The OAuth2
   * standard requires the use of TLS.
   * (Applies to: `oauth2` (`"implicit"`, `"authorizationCode"`))
   */
  authorizationUrl?: string

  /**
   * **REQUIRED**. The token URL to be used for this flow. This MUST be in the form of a URL. The OAuth2 standard
   * requires the use of TLS.
   * (Applies to: `oauth2` (`"password"`, `"clientCredentials"`, `"authorizationCode"`))
   */
  tokenUrl?: string

  /**
   * The URL to be used for obtaining refresh tokens. This MUST be in the form of a URL. The OAuth2 standard requires
   * the use of TLS.
   */
  refreshUrl?: string

  /**
   * **REQUIRED**. The available scopes for the OAuth2 security scheme. A map between the scope name and a short
   * description for it. The map MAY be empty.
   */
  scopes: Record<string, string>

  /**
   * This object MAY be extended with [Specification Extensions](https://spec.openapis.org/oas/v3.1.1.html#specification-extensions).
   */
  [key: `x-${string}`]: any
}

/**
 * Lists the required security schemes to execute this operation. The name used for each property MUST correspond to
 * a security scheme declared in the Security Schemes under the Components Object.
 * @see https://spec.openapis.org/oas/v3.1.1#security-requirement-object
 *
 * @category Types
 */
export interface SecurityRequirementObject {
  /**
   * Each name MUST correspond to a security scheme which is declared in the Security Schemes under the Components
   * Object. If the security scheme is of type `"oauth2"` or `"openIdConnect"`, then the value is a list of scope
   * names required for the execution, and the list MAY be empty if authorization does not require a specified scope.
   * For other security scheme types, the array MAY contain a list of role names which are required for the execution,
   * but are not otherwise defined or exchanged in-band.
   */
  [name: string]: string[]
}

export type { JsonSchemaDraft202012Object }
