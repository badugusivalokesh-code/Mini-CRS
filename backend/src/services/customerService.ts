import type { CustomerRepository } from '../models/Customer'
import type { DealRepository, CustomerRelatedDeal } from '../models/Deal'
import type { TaskRepository, CustomerRelatedTask } from '../models/Task'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../validation/customerSchemas'

export class CustomerService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly deals?: DealRepository,
    private readonly tasks?: TaskRepository,
  ) {}

  create(ownerId: string, data: CustomerData) {
    return this.customers.create(ownerId, data)
  }

  async list(ownerId: string, query: CustomerListQuery) {
    const result = await this.customers.list(ownerId, query)
    return {
      customers: result.customers,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
      },
    }
  }

  async find(ownerId: string, id: string) {
    const customer = await this.customers.findForUser(id, ownerId)
    if (!customer) return null

    let relatedDeals: CustomerRelatedDeal[] = []
    if (this.deals?.listForCustomer) {
      relatedDeals = await this.deals.listForCustomer(ownerId, id)
    }

    let relatedTasks: CustomerRelatedTask[] = []
    if (this.tasks?.listForCustomer) {
      relatedTasks = await this.tasks.listForCustomer(ownerId, id)
    }

    return {
      customer,
      related: {
        deals: relatedDeals,
        tasks: relatedTasks,
      },
    }
  }

  update(ownerId: string, id: string, data: CustomerUpdate) {
    return this.customers.updateForUser(id, ownerId, data)
  }

  delete(ownerId: string, id: string) {
    return this.customers.deleteForUser(id, ownerId)
  }
}