import { apiRequest } from './apiClient'

export interface Customer {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
export type CustomerUpdate = Partial<CustomerInput>

export interface CustomerListResponse {
  customers: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CustomerRelatedDeal {
  id: string
  title: string
  value: number
  stage: string
  expectedCloseDate: string
}

export interface CustomerRelatedTask {
  id: string
  title: string
  dueDate: string
  priority: string
  completed: boolean
  overdue: boolean
}

export interface CustomerDetailResponse {
  customer: Customer
  related: {
    deals: CustomerRelatedDeal[]
    tasks: CustomerRelatedTask[]
  }
}

export const customersApi = {
  list: (query: URLSearchParams) =>
    apiRequest<CustomerListResponse>(`/api/customers?${query.toString()}`),
  get: (id: string) => apiRequest<CustomerDetailResponse>(`/api/customers/${id}`),
  create: (customer: CustomerInput) =>
    apiRequest<{ customer: Customer }>('/api/customers', { method: 'POST', body: customer }),
  update: (id: string, customer: CustomerUpdate) =>
    apiRequest<{ customer: Customer }>(`/api/customers/${id}`, { method: 'PATCH', body: customer }),
  delete: (id: string) =>
    apiRequest<{ message: string }>(`/api/customers/${id}`, { method: 'DELETE' }),
}