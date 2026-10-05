import type { CustomerRepository } from '../models/Customer'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../validation/customerSchemas'

export class CustomerService {
  constructor(private readonly customers: CustomerRepository) {}

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

  find(ownerId: string, id: string) {
    return this.customers.findForUser(id, ownerId)
  }

  update(ownerId: string, id: string, data: CustomerUpdate) {
    return this.customers.updateForUser(id, ownerId, data)
  }

  delete(ownerId: string, id: string) {
    return this.customers.deleteForUser(id, ownerId)
  }
}