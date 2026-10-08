import { Router } from 'express'
import type { CustomerRepository } from '../models/Customer'
import type { DealRepository } from '../models/Deal'
import { mongooseTaskRepository, type TaskRepository } from '../models/Task'
import { TaskService } from '../services/taskService'
import { asyncRoute } from '../utils/asyncRoute'
import { createTaskSchema, updateTaskSchema } from '../validation/taskSchemas'

export function createTasksRouter(
  customers: CustomerRepository,
  deals: DealRepository,
  tasks: TaskRepository = mongooseTaskRepository,
): Router {
  const router = Router()
  const service = new TaskService(tasks, customers, deals)

  router.post('/', asyncRoute(async (request, response) => {
    const parsed = createTaskSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const task = await service.create(ownerId, parsed.data)
    response.status(201).json({ task })
  }))

  router.get('/', asyncRoute(async (request, response) => {
    if (Object.keys(request.query).length > 0) {
      response.status(400).json({ message: 'Invalid query parameters.' })
      return
    }
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    response.status(200).json({ tasks: await service.list(ownerId) })
  }))

  router.get('/:id', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const task = await service.find(ownerId, request.params.id)
    if (!task) {
      response.status(404).json({ message: 'Task not found.' })
      return
    }
    response.status(200).json({ task })
  }))

  router.patch('/:id', asyncRoute(async (request, response) => {
    const parsed = updateTaskSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const task = await service.update(ownerId, request.params.id, parsed.data)
    if (!task) {
      response.status(404).json({ message: 'Task not found.' })
      return
    }
    response.status(200).json({ task })
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    const ownerId = request.authUser?.id
    if (!ownerId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }
    const deleted = await service.delete(ownerId, request.params.id)
    if (!deleted) {
      response.status(404).json({ message: 'Task not found.' })
      return
    }
    response.status(200).json({ message: 'Task deleted.' })
  }))

  return router
}
