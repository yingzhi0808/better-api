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
