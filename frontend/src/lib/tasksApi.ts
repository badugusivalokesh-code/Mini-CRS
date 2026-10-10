import { apiRequest } from './apiClient'

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const
export type TaskPriority = typeof TASK_PRIORITIES[number]

export interface TaskCustomer {
  id: string
  name: string
  company: string
  email: string
}

export interface TaskDeal {
  id: string
  title: string
  value: number
  stage: string
}

export interface Task {
  id: string
  title: string
  dueDate: string
  priority: TaskPriority
  completed: boolean
  overdue: boolean
  customer: TaskCustomer | null
  deal: TaskDeal | null
  createdAt: string
  updatedAt: string
}

export interface TaskInput {
  title: string
  dueDate: string
  priority: TaskPriority
  completed?: boolean
  customer?: string | null
  deal?: string | null
}

export const tasksApi = {
  list: () => apiRequest<{ tasks: Task[] }>('/api/tasks'),
  get: (id: string) => apiRequest<{ task: Task }>(`/api/tasks/${id}`),
  create: (task: TaskInput) => apiRequest<{ task: Task }>('/api/tasks', { method: 'POST', body: task }),
  update: (id: string, task: Partial<TaskInput>) =>
    apiRequest<{ task: Task }>(`/api/tasks/${id}`, { method: 'PATCH', body: task }),
  delete: (id: string) => apiRequest<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' }),
}
