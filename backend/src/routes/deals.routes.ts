import { Router } from 'express'
import type { CustomerRepository } from '../models/Customer'
import { mongooseDealRepository, type DealRepository } from '../models/Deal'
import { DealService } from '../services/dealService'
import { asyncRoute } from '../utils/asyncRoute'
import { createDealSchema, listDealsSchema, updateDealSchema } from '../validation/dealSchemas'

export function createDealsRouter(
  customers: CustomerRepository,
  deals: DealRepository = mongooseDealRepository,
): Router {
  const router = Router()
  const service = new DealService(deals, customers)

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = createDealSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const deal = await service.create(ownerId, parsed.data)
    response.status(201).json({ deal })
  }))

  router.get('/', asyncRoute(async (request, response) => {
    const parsed = listDealsSchema.safeParse(request.query)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid query parameters.' })
      return
    }
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    response.status(200).json({ deals: await service.list(ownerId, parsed.data.stage) })
  }))

  router.get('/:id', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const deal = await service.find(ownerId, request.params.id)
    if (!deal) {
      response.status(404).json({ message: 'Deal not found.' })
      return
    }
    response.status(200).json({ deal })
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    const parsed = updateDealSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const deal = await service.update(ownerId, request.params.id, parsed.data)
    if (!deal) {
      response.status(404).json({ message: 'Deal not found.' })
      return
    }
    response.status(200).json({ deal })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const deleted = await service.delete(ownerId, request.params.id)
    if (!deleted) {
      response.status(404).json({ message: 'Deal not found.' })
      return
    }
    response.status(200).json({ message: 'Deal deleted.' })
  }))

  return router
}