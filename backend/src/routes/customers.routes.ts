import { Router } from 'express'
import { CustomerService } from '../services/customerService'
import { mongooseCustomerRepository, type CustomerRepository } from '../models/Customer'
import { mongooseDealRepository, type DealRepository } from '../models/Deal'
import { mongooseTaskRepository, type TaskRepository } from '../models/Task'
import { asyncRoute } from '../utils/asyncRoute'
import { createCustomerSchema, listCustomersSchema, updateCustomerSchema } from '../validation/customerSchemas'

export function createCustomersRouter(
  customers: CustomerRepository = mongooseCustomerRepository,
  deals: DealRepository = mongooseDealRepository,
  tasks: TaskRepository = mongooseTaskRepository,
): Router {
  const router = Router()
  const service = new CustomerService(customers, deals, tasks)

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = createCustomerSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }

    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const customer = await service.create(ownerId, parsed.data)
    response.status(201).json({ customer })
  }))

  router.get('/', asyncRoute(async (request, response) => {
    const parsed = listCustomersSchema.safeParse(request.query)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid query parameters.' })
      return
    }

    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    response.status(200).json(await service.list(ownerId, parsed.data))
  }))

  router.get('/:id', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const result = await service.find(ownerId, request.params.id)
    if (!result) {
      response.status(404).json({ message: 'Customer not found.' })
      return
    }
    response.status(200).json(result)
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    const parsed = updateCustomerSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }

    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const customer = await service.update(ownerId, request.params.id, parsed.data)
    if (!customer) {
      response.status(404).json({ message: 'Customer not found.' })
      return
    }
    response.status(200).json({ customer })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const deleted = await service.delete(ownerId, request.params.id)
    if (!deleted) {
      response.status(404).json({ message: 'Customer not found.' })
      return
    }
    response.status(200).json({ message: 'Customer deleted.' })
  }))

  return router
}