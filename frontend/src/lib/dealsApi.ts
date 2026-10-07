import { apiRequest } from './apiClient'

export const DEAL_STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const
export type DealStage = typeof DEAL_STAGES[number]

export interface DealCustomer {
  id: string
  name: string
  company: string
  email: string
}

export interface Deal {
  id: string
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: string
  customer: DealCustomer | null
  createdAt: string
  updatedAt: string
}

export interface DealInput {
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: string
  customer: string
}

export const dealsApi = {
  list: (stage?: DealStage) => {
    const query = new URLSearchParams()
    if (stage) query.set('stage', stage)
    return apiRequest<{ deals: Deal[] }>(`/api/deals?${query.toString()}`)
  },
  get: (id: string) => apiRequest<{ deal: Deal }>(`/api/deals/${id}`),
  create: (deal: DealInput) => apiRequest<{ deal: Deal }>('/api/deals', { method: 'POST', body: deal }),
  update: (id: string, deal: Partial<DealInput>) =>
    apiRequest<{ deal: Deal }>(`/api/deals/${id}`, { method: 'PATCH', body: deal }),
  delete: (id: string) => apiRequest<{ message: string }>(`/api/deals/${id}`, { method: 'DELETE' }),
}