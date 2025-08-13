import type { ZodType } from 'zod'

export function isZodType(value: unknown): value is ZodType {
  return typeof value === 'object' && value !== null && '_zod' in value
}
