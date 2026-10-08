import type { DashboardRepository } from '../models/Dashboard'

export class DashboardService {
  constructor(private readonly dashboard: DashboardRepository) {}

  getDashboard(ownerId: string) {
    return this.dashboard.getDashboard(ownerId)
  }
}
