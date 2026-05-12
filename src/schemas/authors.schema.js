import { z } from 'zod'

const trimmedString = z.string().trim()
const optionalTrimmedString = z.preprocess(
  value => value === '' ? null : value,
  trimmedString.min(1).optional().nullable(),
)
const optionalEmail = z.preprocess(
  value => value === '' ? null : value,
  trimmedString.email().optional().nullable(),
)

export const authorCreateSchema = z.object({
  name: trimmedString.min(1).max(100),
  bio: optionalTrimmedString,
  email: optionalEmail,
})

export const authorUpdateSchema = authorCreateSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' },
)
