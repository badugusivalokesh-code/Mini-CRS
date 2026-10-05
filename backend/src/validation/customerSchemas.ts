import { z } from 'zod'

export const customerFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  company: z.string().trim().min(1, 'Company is required.').max(160),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  phone: z.string().trim().min(1, 'Phone is required.').max(40),
  status: z.string().trim().min(1, 'Status is required.').max(40),
  notes: z.string().trim().max(2000),
}).strict()

export const createCustomerSchema = customerFieldsSchema

export const updateCustomerSchema = customerFieldsSchema.partial().strict().refine(
  (customer) => Object.keys(customer).length > 0,
  'Provide at least one field to update.',
)

export const listCustomersSchema = z.object({
  search: z.string().trim().max(160).optional(),
  status: z.string().trim().min(1).max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict()

export type CustomerData = z.infer<typeof customerFieldsSchema>
export type CustomerUpdate = z.infer<typeof updateCustomerSchema>
export type CustomerListQuery = z.infer<typeof listCustomersSchema>