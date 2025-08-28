import type { ZodType } from 'zod'

/**
 * HTTP 方法类型
 */
export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'options'
  | 'head'
  | 'trace'

/**
 * 参数位置类型
 */
export type ParameterIn = 'query' | 'header' | 'path' | 'cookie'

/**
 * 参数样式类型
 */
export type ParameterStyle =
  | 'matrix'
  | 'label'
  | 'simple'
  | 'form'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject'

/**
 * Body选项类型
 * 支持两种写法：
 * 1. body: zodSchema
 * 2. body: { schema: zodSchema, required?: boolean, description?: string }
 */
export type BodyOption<T extends ZodType = ZodType> =
  | T
  | {
      schema: T
      required?: boolean
      description?: string
    }


