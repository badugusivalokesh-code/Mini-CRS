import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import type { Application } from 'express'
import request from 'supertest'
import type { CustomerListResult, CustomerRecord, CustomerRepository } from '../src/models/Customer'
import type { UserRecord, UserRepository } from '../src/models/User'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../src/validation/customerSchemas'

const firstUserId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const secondUserId = 'bbbbbbbbbbbbbbbbbbbbbbbb'

class MemoryUserRepository implements UserRepository {
  private readonly records: UserRecord[] = [
    { id: firstUserId, email: 'first@example.com', passwordHash: 'unused-test-hash' },
    { id: secondUserId, email: 'second@example.com', passwordHash: 'unused-test-hash' },
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
  private records: OwnedCustomer[] = []
  private nextId = 1

  async create(ownerId: string, data: CustomerData): Promise<CustomerRecord> {
    const id = this.nextId.toString(16).padStart(24, '0')
    this.nextId += 1
    const now = new Date()
    const record = { ...data, id, ownerId, createdAt: now, updatedAt: now }
    this.records.push(record)
    return this.publicRecord(record)
  }

  async list(ownerId: string, query: CustomerListQuery): Promise<CustomerListResult> {
    let filtered = this.records.filter((record) => record.ownerId === ownerId)
    if (query.status) filtered = filtered.filter((record) => record.status === query.status)
    if (query.search) {
      const search = query.search.toLocaleLowerCase()
      filtered = filtered.filter((record) =>
        [record.name, record.company, record.email].some((value) => value.toLocaleLowerCase().includes(search)),
      )
    }

    filtered.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    const total = filtered.length
    const start = (query.page - 1) * query.limit
    return {
      customers: filtered.slice(start, start + query.limit).map((record) => this.publicRecord(record)),
      total,
    }
  }

  async findForUser(id: string, ownerId: string): Promise<CustomerRecord | null> {
    const record = this.records.find((customer) => customer.id === id && customer.ownerId === ownerId)
    return record ? this.publicRecord(record) : null
  }

  async updateForUser(id: string, ownerId: string, data: CustomerUpdate): Promise<CustomerRecord | null> {
    const record = this.records.find((customer) => customer.id === id && customer.ownerId === ownerId)
    if (!record) return null
    Object.assign(record, data, { updatedAt: new Date() })
    return this.publicRecord(record)
  }

  async deleteForUser(id: string, ownerId: string): Promise<boolean> {
    const index = this.records.findIndex((customer) => customer.id === id && customer.ownerId === ownerId)
    if (index < 0) return false
    this.records.splice(index, 1)
    return true
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

const customerInput: CustomerData = {
  name: 'Barbara Anderson',
  company: 'Northstar Realty',
  email: 'barbara@example.com',
  phone: '310-685-3335',
  status: 'active',
  notes: 'Follow up next week.',
}

let createApp: (options?: {
  userRepository?: UserRepository
  customerRepository?: CustomerRepository
}) => Application
let createAuthToken: (userId: string) => string
let app: Application
let customers: MemoryCustomerRepository

before(async () => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mini-crm-test'
  process.env.JWT_SECRET = 'test-only-customer-api-secret'
  process.env.CLIENT_URL = 'http://localhost:5173'
  process.env.NODE_ENV = 'test'
  ;({ createApp } = await import('../src/app'))
  ;({ createAuthToken } = await import('../src/utils/authToken'))
})

beforeEach(() => {
  customers = new MemoryCustomerRepository()
  app = createApp({
    userRepository: new MemoryUserRepository(),
    customerRepository: customers,
  })
})

function authCookie(userId = firstUserId): string {
  return `mini_crm_auth=${createAuthToken(userId)}`
}

function authenticatedGet(path: string, userId = firstUserId) {
  return request(app).get(path).set('Cookie', authCookie(userId))
}

test('authenticated user can create a customer with server-derived ownership', async () => {
  const response = await request(app).post('/api/customers')
    .set('Cookie', authCookie())
    .send(customerInput)

  assert.equal(response.status, 201)
  assert.equal(response.body.customer.name, customerInput.name)
  assert.equal(response.body.customer.id, '000000000000000000000001')
  assert.equal(response.body.customer.ownerId, undefined)
})

test('customer endpoints reject unauthenticated requests', async () => {
  const list = await request(app).get('/api/customers')
  const create = await request(app).post('/api/customers').send(customerInput)

  assert.equal(list.status, 401)
  assert.equal(create.status, 401)
})

test('customer list includes only records owned by the authenticated user', async () => {
  await customers.create(firstUserId, customerInput)
  await customers.create(secondUserId, { ...customerInput, email: 'other@example.com', name: 'Other User' })

  const response = await authenticatedGet('/api/customers')

  assert.equal(response.status, 200)
  assert.equal(response.body.pagination.total, 1)
  assert.equal(response.body.customers.length, 1)
  assert.equal(response.body.customers[0].email, customerInput.email)
})

test('user can view an owned customer and receives future related-data slots', async () => {
  const customer = await customers.create(firstUserId, customerInput)
  const response = await authenticatedGet(`/api/customers/${customer.id}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.customer.id, customer.id)
  assert.deepEqual(response.body.related, { deals: [], tasks: [] })
})

test('user cannot view another user customer', async () => {
  const customer = await customers.create(secondUserId, customerInput)
  const response = await authenticatedGet(`/api/customers/${customer.id}`)

  assert.equal(response.status, 404)
  assert.equal(response.body.message, 'Customer not found.')
})

test('user can update an owned customer', async () => {
  const customer = await customers.create(firstUserId, customerInput)
  const response = await request(app).patch(`/api/customers/${customer.id}`)
    .set('Cookie', authCookie())
    .send({ company: 'New Company' })

  assert.equal(response.status, 200)
  assert.equal(response.body.customer.company, 'New Company')
})

test('user cannot update another user customer', async () => {
  const customer = await customers.create(secondUserId, customerInput)
  const response = await request(app).patch(`/api/customers/${customer.id}`)
    .set('Cookie', authCookie())
    .send({ company: 'Changed by another user' })

  assert.equal(response.status, 404)
  assert.equal((await customers.findForUser(customer.id, secondUserId))?.company, customerInput.company)
})

test('user can delete an owned customer', async () => {
  const customer = await customers.create(firstUserId, customerInput)
  const response = await request(app).delete(`/api/customers/${customer.id}`)
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.equal(await customers.findForUser(customer.id, firstUserId), null)
})

test('user cannot delete another user customer', async () => {
  const customer = await customers.create(secondUserId, customerInput)
  const response = await request(app).delete(`/api/customers/${customer.id}`)
    .set('Cookie', authCookie())

  assert.equal(response.status, 404)
  assert.ok(await customers.findForUser(customer.id, secondUserId))
})

test('invalid customer data and client-supplied ownership return 400', async () => {
  const invalid = await request(app).post('/api/customers')
    .set('Cookie', authCookie())
    .send({ ...customerInput, email: 'not-an-email' })
  const ownership = await request(app).post('/api/customers')
    .set('Cookie', authCookie())
    .send({ ...customerInput, user: secondUserId })

  assert.equal(invalid.status, 400)
  assert.equal(ownership.status, 400)
})

test('customer search matches name, company, or email', async () => {
  await customers.create(firstUserId, customerInput)
  await customers.create(firstUserId, {
    ...customerInput,
    email: 'another@example.com',
    name: 'John Smith',
    company: 'Different Company',
  })
  await customers.create(secondUserId, { ...customerInput, name: 'Private Northstar' })

  const response = await authenticatedGet('/api/customers?search=northstar')

  assert.equal(response.status, 200)
  assert.equal(response.body.pagination.total, 1)
  assert.equal(response.body.customers[0].company, 'Northstar Realty')
})

test('customer status filter is applied on the server', async () => {
  await customers.create(firstUserId, customerInput)
  await customers.create(firstUserId, { ...customerInput, email: 'inactive@example.com', status: 'inactive' })

  const response = await authenticatedGet('/api/customers?status=active')

  assert.equal(response.status, 200)
  assert.equal(response.body.pagination.total, 1)
  assert.equal(response.body.customers[0].status, 'active')
})

test('customer pagination is performed by the repository and includes metadata', async () => {
  for (let index = 0; index < 5; index += 1) {
    await customers.create(firstUserId, { ...customerInput, email: `user${index}@example.com` })
  }

  const response = await authenticatedGet('/api/customers?page=2&limit=2')

  assert.equal(response.status, 200)
  assert.equal(response.body.customers.length, 2)
  assert.deepEqual(response.body.pagination, { page: 2, limit: 2, total: 5, totalPages: 3 })
})