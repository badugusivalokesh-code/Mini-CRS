import type { CustomerRepository } from '../models/Customer'
import type { DealRepository } from '../models/Deal'
import type { TaskRepository } from '../models/Task'
import type { TaskData, TaskUpdate } from '../validation/taskSchemas'

export class TaskError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TaskError'
  }
}

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly customers: CustomerRepository,
    private readonly deals: DealRepository,
  ) {}

  async create(ownerId: string, data: TaskData) {
    await this.validateReferences(ownerId, data)
    return this.tasks.create(ownerId, data)
  }

  list(ownerId: string) {
    return this.tasks.list(ownerId)
  }

  find(ownerId: string, id: string) {
    return this.tasks.findForUser(id, ownerId)
  }

  async update(ownerId: string, id: string, data: TaskUpdate) {
    const existing = await this.tasks.findForUser(id, ownerId)
    if (!existing) return null
    await this.validateReferences(ownerId, data)
    return this.tasks.updateForUser(id, ownerId, data)
  }

  delete(ownerId: string, id: string) {
    return this.tasks.deleteForUser(id, ownerId)
  }

  private async validateReferences(
    ownerId: string,
    data: Pick<TaskData, 'customer' | 'deal'> | Pick<TaskUpdate, 'customer' | 'deal'>,
  ): Promise<void> {
    if (data.customer) {
      const customer = await this.customers.findForUser(data.customer, ownerId)
      if (!customer) throw new TaskError('Selected customer is not available.', 400)
    }
    if (data.deal) {
      const deal = await this.deals.findForUser(data.deal, ownerId)
      if (!deal) throw new TaskError('Selected deal is not available.', 400)
    }
  }
}
