import { z } from 'zod'

const trimmedString = z.string().trim()
const optionalTrimmedString = trimmedString.min(1).optional().nullable()
const optionalId = z.coerce.number().int().positive().optional().nullable()

export const documentCreateSchema = z.object({
  title: trimmedString.min(1),
  description: optionalTrimmedString,
  type: trimmedString.min(1),
  published_at: z.union([trimmedString.min(1), z.coerce.date()]).optional().nullable(),
  file_url: trimmedString.url(),
  author_id: z.coerce.number().int().positive(),
  project_id: optionalId,
  location_id: optionalId,
}).strict()

export const documentUpdateSchema = documentCreateSchema.partial()
