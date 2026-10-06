import type { CustomerRepository } from '../models/Customer'
import type { DealRepository } from '../models/Deal'
import type { DealData, DealStage, DealUpdate } from '../validation/dealSchemas'

export class DealError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'DealError'
  }
}

export class DealService {
  constructor(
    private readonly deals: DealRepository,
    private readonly customers: CustomerRepository,
  ) {}

  async create(ownerId: string, data: DealData) {
    await this.requireOwnedCustomer(data.customer, ownerId)
    return this.deals.create(ownerId, data)
  }

  list(ownerId: string, stage?: DealStage) {
    return this.deals.list(ownerId, stage)
  }

  find(ownerId: string, id: string) {
    return this.deals.findForUser(id, ownerId)
  }

  async update(ownerId: string, id: string, data: DealUpdate) {
    const existing = await this.deals.findForUser(id, ownerId)
    if (!existing) return null
    if (data.customer) await this.requireOwnedCustomer(data.customer, ownerId)
    return this.deals.updateForUser(id, ownerId, data)
  }

  delete(ownerId: string, id: string) {
    return this.deals.deleteForUser(id, ownerId)
  }

  private async requireOwnedCustomer(customerId: string, ownerId: string): Promise<void> {
    const customer = await this.customers.findForUser(customerId, ownerId)
    if (!customer) throw new DealError('Selected customer is not available.', 400)
  }
}