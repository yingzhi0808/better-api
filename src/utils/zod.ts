import type { ZodType } from 'zod'

export function isZodType(obj: unknown): obj is ZodType {
  return typeof obj === 'object' && obj !== null && '_zod' in obj
}
