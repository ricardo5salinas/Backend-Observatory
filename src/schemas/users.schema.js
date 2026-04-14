import { z } from 'zod'

const trimmedString = z.string().trim()

const statusSchema = z.union([
  z.enum(['active', 'inactive', 'deleted']),
  z.boolean(),
])

const userSchemaBase = z.object({
  name: trimmedString.min(1).optional(),
  first_name: trimmedString.min(1).optional(),
  last_name: trimmedString.min(1).optional(),
  email: trimmedString.email(),
  password: z.string().min(6),
  role_id: z.coerce.number().int().positive().optional(),
  role: z.union([trimmedString.min(1), z.coerce.number().int().positive()]).optional(),
  status: statusSchema.optional(),
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
