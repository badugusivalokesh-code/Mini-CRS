import { z } from 'zod'

export const DEAL_STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const

const dealFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(160),
  value: z.coerce.number().finite().min(0, 'Value cannot be negative.'),
  stage: z.enum(DEAL_STAGES),
  expectedCloseDate: z.coerce.date(),
  customer: z.string().regex(/^[a-f\d]{24}$/i, 'Select a valid customer.'),
}).strict()

export const createDealSchema = dealFieldsSchema

export const updateDealSchema = dealFieldsSchema.partial().strict().refine(
  (deal) => Object.keys(deal).length > 0,
  'Provide at least one field to update.',
)

export const listDealsSchema = z.object({
  stage: z.enum(DEAL_STAGES).optional(),
}).strict()

export type DealData = z.infer<typeof dealFieldsSchema>
export type DealUpdate = z.infer<typeof updateDealSchema>
export type DealStage = typeof DEAL_STAGES[number]