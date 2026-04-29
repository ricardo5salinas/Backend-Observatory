import { z } from 'zod'

export const postStatusSchema = z.enum(['pending_approval', 'approved', 'rejected'])

export const postCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  status: postStatusSchema.optional(),
  user_id: z.number(),
  category_id: z.number(),
  author_id: z.number(),
})

export const postUpdateSchema = postCreateSchema.partial()

export const postStatusUpdateSchema = z.object({
  status: postStatusSchema,
})
