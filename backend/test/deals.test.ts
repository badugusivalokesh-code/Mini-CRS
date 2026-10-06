import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import type { Application } from 'express'
import request from 'supertest'
import type { CustomerListResult, CustomerRecord, CustomerRepository } from '../src/models/Customer'
import type { DealRecord, DealRepository } from '../src/models/Deal'
import type { UserRecord, UserRepository } from '../src/models/User'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../src/validation/customerSchemas'
import type { DealData, DealStage, DealUpdate } from '../src/validation/dealSchemas'

const ownerId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const otherUserId = 'bbbbbbbbbbbbbbbbbbbbbbbb'

class MemoryUserRepository implements UserRepository {
  private readonly records: UserRecord[] = [
    { id: ownerId, email: 'owner@example.com' },
    { id: otherUserId, email: 'other@example.com' },
  ]

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.records.find((record) => record.email === email) ?? null
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.records.find((record) => record.id === id) ?? null
  }

  async create(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    const record = { id: 'cccccccccccccccccccccccc', ...input }
    this.records.push(record)
    return record
  }
}

interface OwnedCustomer extends CustomerRecord {
  ownerId: string
}

class MemoryCustomerRepository implements CustomerRepository {
  private readonly records = new Map<string, OwnedCustomer>()
  private nextId = 1

  async create(customerOwnerId: string, data: CustomerData): Promise<CustomerRecord> {
    const id = this.nextId.toString(16).padStart(24, '0')
    this.nextId += 1
    const now = new Date()
    const record = { ...data, id, ownerId: customerOwnerId, createdAt: now, updatedAt: now }
    this.records.set(id, record)
    return this.publicRecord(record)
  }

  async list(customerOwnerId: string, query: CustomerListQuery): Promise<CustomerListResult> {
    const owned = [...this.records.values()].filter((record) => record.ownerId === customerOwnerId)
    const start = (query.page - 1) * query.limit
    return {
      customers: owned.slice(start, start + query.limit).map((record) => this.publicRecord(record)),
      total: owned.length,
    }
  }

  async findForUser(id: string, customerOwnerId: string): Promise<CustomerRecord | null> {
    const record = this.records.get(id)
    return record?.ownerId === customerOwnerId ? this.publicRecord(record) : null
  }

  async updateForUser(id: string, customerOwnerId: string, data: CustomerUpdate): Promise<CustomerRecord | null> {
    const record = this.records.get(id)
    if (!record || record.ownerId !== customerOwnerId) return null
    Object.assign(record, data, { updatedAt: new Date() })
    return this.publicRecord(record)
  }

  async deleteForUser(id: string, customerOwnerId: string): Promise<boolean> {
    const record = this.records.get(id)
    if (!record || record.ownerId !== customerOwnerId) return false
    return this.records.delete(id)
  }

  private publicRecord(record: OwnedCustomer): CustomerRecord {
    return {
      id: record.id,
      name: record.name,
      company: record.company,
      email: record.email,
      phone: record.phone,
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}

class MemoryDealRepository implements DealRepository {
  private readonly records = new Map<string, DealRecord & { ownerId: string }>()
  private nextId = 1

  constructor(private readonly customers: MemoryCustomerRepository) {}

  async create(dealOwnerId: string, data: DealData): Promise<DealRecord> {
    const customer = await this.customers.findForUser(data.customer, dealOwnerId)
    if (!customer) throw new Error('Customer missing from test repository')
    const id = this.nextId.toString(16).padStart(24, '0')
    this.nextId += 1
    const now = new Date()
    const record = {
      id,
      ownerId: dealOwnerId,
      title: data.title,
      value: data.value,
      stage: data.stage,
      expectedCloseDate: data.expectedCloseDate,
      customer: { id: customer.id, name: customer.name, company: customer.company, email: customer.email },
      createdAt: now,
      updatedAt: now,
    }
    this.records.set(id, record)
    return this.publicRecord(record)
  }

  async list(dealOwnerId: string, stage?: DealStage): Promise<DealRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.ownerId === dealOwnerId && (!stage || record.stage === stage))
      .map((record) => this.publicRecord(record))
  }

  async findForUser(id: string, dealOwnerId: string): Promise<DealRecord | null> {
    const record = this.records.get(id)
    return record?.ownerId === dealOwnerId ? this.publicRecord(record) : null
  }

  async updateForUser(id: string, dealOwnerId: string, data: DealUpdate): Promise<DealRecord | null> {
    const record = this.records.get(id)
    if (!record || record.ownerId !== dealOwnerId) return null
    if (data.customer) {
      const customer = await this.customers.findForUser(data.customer, dealOwnerId)
      if (!customer) throw new Error('Customer missing from test repository')
      record.customer = { id: customer.id, name: customer.name, company: customer.company, email: customer.email }
    }
    Object.assign(record, data, { updatedAt: new Date() })
    return this.publicRecord(record)
  }

  async deleteForUser(id: string, dealOwnerId: string): Promise<boolean> {
    const record = this.records.get(id)
    if (!record || record.ownerId !== dealOwnerId) return false
    return this.records.delete(id)
  }

  private publicRecord(record: DealRecord & { ownerId: string }): DealRecord {
    return {
      id: record.id,
      title: record.title,
      value: record.value,
      stage: record.stage,
      expectedCloseDate: record.expectedCloseDate,
      customer: record.customer,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }
  }
}

const customerInput: CustomerData = {
  name: 'Barbara Anderson',
  company: 'Northstar Realty',
  email: 'barbara@example.com',
  phone: '310-685-3335',
  status: 'active',
  notes: '',
}

let createApp: (options?: {
  userRepository?: UserRepository
  customerRepository?: CustomerRepository
  dealRepository?: DealRepository
}) => Application
let createAuthToken: (userId: string) => string
let app: Application
let customers: MemoryCustomerRepository
let deals: MemoryDealRepository
let ownedCustomerId: string
let foreignCustomerId: string

before(async () => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mini-crm-test'
  process.env.JWT_SECRET = 'test-only-deals-api-secret'
  process.env.CLIENT_URL = 'http://localhost:5173'
  process.env.NODE_ENV = 'test'
  ;({ createApp } = await import('../src/app'))
  ;({ createAuthToken } = await import('../src/utils/authToken'))
})

beforeEach(async () => {
  customers = new MemoryCustomerRepository()
  const ownedCustomer = await customers.create(ownerId, customerInput)
  const foreignCustomer = await customers.create(otherUserId, { ...customerInput, email: 'foreign@example.com' })
  ownedCustomerId = ownedCustomer.id
  foreignCustomerId = foreignCustomer.id
  deals = new MemoryDealRepository(customers)
  app = createApp({
    userRepository: new MemoryUserRepository(),
    customerRepository: customers,
    dealRepository: deals,
  })
})

function authCookie(userId = ownerId): string {
  return `mini_crm_auth=${createAuthToken(userId)}`
}

function dealInput(customer = ownedCustomerId) {
  return {
    title: 'Northstar Renovation',
    value: 12500,
    stage: 'Lead',
    expectedCloseDate: '2027-03-18',
    customer,
  }
}

async function createOwnedDeal(): Promise<{ id: string }> {
  const response = await request(app).post('/api/deals')
    .set('Cookie', authCookie())
    .send(dealInput())
  assert.equal(response.status, 201)
  return response.body.deal as { id: string }
}

test('authenticated user can create and list their deals', async () => {
  const created = await request(app).post('/api/deals')
    .set('Cookie', authCookie())
    .send(dealInput())
  await deals.create(otherUserId, { ...dealInput(), title: 'Private deal', customer: foreignCustomerId })

  const listed = await request(app).get('/api/deals').set('Cookie', authCookie())

  assert.equal(created.status, 201)
  assert.equal(created.body.deal.customer.name, customerInput.name)
  assert.equal(listed.status, 200)
  assert.equal(listed.body.deals.length, 1)
  assert.equal(listed.body.deals[0].title, 'Northstar Renovation')
})

test('deals endpoints reject unauthenticated access', async () => {
  const response = await request(app).get('/api/deals')
  assert.equal(response.status, 401)
})

test('user can view their deal but receives 404 for another user deal', async () => {
  const owned = await createOwnedDeal()
  const foreign = await deals.create(otherUserId, { ...dealInput(), customer: foreignCustomerId })

  assert.equal((await request(app).get(`/api/deals/${owned.id}`).set('Cookie', authCookie())).status, 200)
  const response = await request(app).get(`/api/deals/${foreign.id}`).set('Cookie', authCookie())
  assert.equal(response.status, 404)
  assert.equal(response.body.message, 'Deal not found.')
})

test('user can update their deal and persist a stage change', async () => {
  const deal = await createOwnedDeal()
  const response = await request(app).patch(`/api/deals/${deal.id}`)
    .set('Cookie', authCookie())
    .send({ stage: 'Qualified' })

  assert.equal(response.status, 200)
  assert.equal(response.body.deal.stage, 'Qualified')
  assert.equal((await deals.findForUser(deal.id, ownerId))?.stage, 'Qualified')
})

test('user cannot update or delete another user deal', async () => {
  const foreign = await deals.create(otherUserId, { ...dealInput(), customer: foreignCustomerId })
  const update = await request(app).patch(`/api/deals/${foreign.id}`)
    .set('Cookie', authCookie())
    .send({ stage: 'Won' })
  const remove = await request(app).delete(`/api/deals/${foreign.id}`).set('Cookie', authCookie())

  assert.equal(update.status, 404)
  assert.equal(remove.status, 404)
  assert.equal((await deals.findForUser(foreign.id, otherUserId))?.stage, 'Lead')
})

test('user can delete their own deal', async () => {
  const deal = await createOwnedDeal()
  const response = await request(app).delete(`/api/deals/${deal.id}`).set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.equal(await deals.findForUser(deal.id, ownerId), null)
})

test('invalid deal fields and client-supplied ownership return 400', async () => {
  const invalid = await request(app).post('/api/deals')
    .set('Cookie', authCookie())
    .send({ ...dealInput(), stage: 'Negotiation', value: -1 })
  const ownership = await request(app).post('/api/deals')
    .set('Cookie', authCookie())
    .send({ ...dealInput(), user: otherUserId })

  assert.equal(invalid.status, 400)
  assert.equal(ownership.status, 400)
})

test('invalid or another user customer references return 400', async () => {
  const invalid = await request(app).post('/api/deals')
    .set('Cookie', authCookie())
    .send(dealInput('not-an-object-id'))
  const foreign = await request(app).post('/api/deals')
    .set('Cookie', authCookie())
    .send(dealInput(foreignCustomerId))

  assert.equal(invalid.status, 400)
  assert.equal(foreign.status, 400)
})

test('updating a deal to another user customer returns 400 without changing the stage', async () => {
  const deal = await createOwnedDeal()
  const response = await request(app).patch(`/api/deals/${deal.id}`)
    .set('Cookie', authCookie())
    .send({ stage: 'Won', customer: foreignCustomerId })

  assert.equal(response.status, 400)
  assert.equal((await deals.findForUser(deal.id, ownerId))?.stage, 'Lead')
})

test('deal stage filter returns only the requested stage', async () => {
  await createOwnedDeal()
  const second = await createOwnedDeal()
  await deals.updateForUser(second.id, ownerId, { stage: 'Won' })

  const response = await request(app).get('/api/deals?stage=Won').set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.equal(response.body.deals.length, 1)
  assert.equal(response.body.deals[0].stage, 'Won')
})