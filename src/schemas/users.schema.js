import { z } from 'zod'

const trimmedString = z.string().trim()
const optionalTrimmedString = trimmedString.min(1).optional().nullable()

const statusSchema = z.union([
  z.enum(['active', 'inactive', 'deleted']),
  z.boolean(),
])

const optionalStatusSchema = z.preprocess(
  value => value === null ? undefined : value,
  statusSchema.optional(),
)

const userSchemaBase = z.object({
  name: trimmedString.min(1).optional(),
  first_name: trimmedString.min(1).optional(),
  last_name: trimmedString.min(1).optional(),
  dni: optionalTrimmedString,
  email: trimmedString.email(),
  password: z.string().min(6),
  phone: optionalTrimmedString,
  role_id: z.coerce.number().int().positive().optional(),
  role: z.union([trimmedString.min(1), z.coerce.number().int().positive()]).optional(),
  role_name: trimmedString.min(1).optional(),
  last_login: z.union([trimmedString.min(1), z.coerce.date()]).optional().nullable(),
  profile_image_url: optionalTrimmedString,
  status: optionalStatusSchema,
}).strict()

export const userCreateSchema = userSchemaBase.refine(
  data => Boolean(data.name || data.first_name),
  { message: 'name o first_name es requerido', path: ['name'] },
)

export const userUpdateSchema = userSchemaBase
  .partial()
  .strict()

export const loginSchema = z.object({
  email: trimmedString.email(),
  password: z.string().min(1),
}).strict()
