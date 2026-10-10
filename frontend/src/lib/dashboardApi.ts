import { apiRequest } from './apiClient'

export interface PipelineStageValue {
  stage: string
  value: number
  count: number
}

export interface DashboardData {
  totalCustomers: number
  openPipelineValue: number
  dealsWonThisMonth: number
  tasksDueToday: number
  overdueTasks: number
  pipelineByStage: PipelineStageValue[]
}

export const dashboardApi = {
  get: () => apiRequest<{ dashboard: DashboardData }>('/api/dashboard'),
}
