import { z } from 'zod'

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const

const optionalReference = z.union([
  z.string().regex(/^[a-f\d]{24}$/i, 'Select a valid record.'),
  z.null(),
])

const taskFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(160),
  dueDate: z.iso.date().transform((value) => new Date(value)),
  priority: z.enum(TASK_PRIORITIES),
  completed: z.boolean().optional(),
  customer: optionalReference.optional(),
  deal: optionalReference.optional(),
}).strict()

export const createTaskSchema = taskFieldsSchema

export const updateTaskSchema = taskFieldsSchema.partial().strict().refine(
  (task) => Object.keys(task).length > 0,
  'Provide at least one field to update.',
)

export type TaskData = z.infer<typeof taskFieldsSchema>
export type TaskUpdate = z.infer<typeof updateTaskSchema>
export type TaskPriority = typeof TASK_PRIORITIES[number]
