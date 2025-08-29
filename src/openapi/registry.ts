import type { OpenApiRouteConfig } from './types'

export const openAPIRoutes: OpenApiRouteConfig[] = []

export function registerOpenApiRoute(route: OpenApiRouteConfig) {
  openAPIRoutes.push(route)
}
