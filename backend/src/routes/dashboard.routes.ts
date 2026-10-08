import { Router } from 'express'
import { mongooseDashboardRepository, type DashboardRepository } from '../models/Dashboard'
import { DashboardService } from '../services/dashboardService'
import { asyncRoute } from '../utils/asyncRoute'

export function createDashboardRouter(
  dashboard: DashboardRepository = mongooseDashboardRepository,
): Router {
  const router = Router()
  const service = new DashboardService(dashboard)

  router.get('/', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const data = await service.getDashboard(ownerId)
    response.status(200).json({ dashboard: data })
  }))

  return router
}
