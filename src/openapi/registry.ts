import type { OpenApiRouteConfig } from './types'

export const openApiRoutes: OpenApiRouteConfig[] = []

export function registerOpenApiRoute(route: OpenApiRouteConfig) {
  openApiRoutes.push(route)
}
