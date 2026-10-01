import { z } from 'zod'

const passwordSchema = z.string().refine(
  (password) => Buffer.byteLength(password, 'utf8') <= 72,
  'Password must be 72 bytes or fewer.',
)

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254)

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema.min(8, 'Password must be at least 8 characters.'),
}).strict()

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema.min(1, 'Password is required.'),
}).strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>