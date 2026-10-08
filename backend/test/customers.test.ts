import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import type { Application } from 'express'
import request from 'supertest'
import type { CustomerListResult, CustomerRecord, CustomerRepository } from '../src/models/Customer'
import type { CustomerRelatedDeal, DealRecord, DealRepository } from '../src/models/Deal'
import type { CustomerRelatedTask, TaskRecord, TaskRepository } from '../src/models/Task'
import type { UserRecord, UserRepository } from '../src/models/User'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../src/validation/customerSchemas'
import type { DealData, DealStage } from '../src/validation/dealSchemas'
import type { TaskData, TaskPriority } from '../src/validation/taskSchemas'
import type { AppOptions } from '../src/app'

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

interface MemoryDealItem {
  id: string
  ownerId: string
  customerId: string
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: Date
}

class MemoryDealRepository implements DealRepository {
  private records: MemoryDealItem[] = []
  private nextId = 1

  async addTestDeal(item: Omit<MemoryDealItem, 'id'>): Promise<MemoryDealItem> {
    const id = `deal_${(this.nextId++).toString(16).padStart(8, '0')}`
    const record = { ...item, id }
    this.records.push(record)
    return record
  }

  async create(ownerId: string, data: DealData): Promise<DealRecord> {
    const item = await this.addTestDeal({
      ownerId,
      customerId: data.customer,
      title: data.title,
      value: data.value,
      stage: data.stage,
      expectedCloseDate: data.expectedCloseDate,
    })
    return {
      id: item.id,
      title: item.title,
      value: item.value,
      stage: item.stage,
      expectedCloseDate: item.expectedCloseDate,
      customer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async list(ownerId: string, stage?: DealStage): Promise<DealRecord[]> {
    return this.records
      .filter((r) => r.ownerId === ownerId && (!stage || r.stage === stage))
      .map((r) => ({
        id: r.id,
        title: r.title,
        value: r.value,
        stage: r.stage,
        expectedCloseDate: r.expectedCloseDate,
        customer: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
  }

  async listForCustomer(ownerId: string, customerId: string): Promise<CustomerRelatedDeal[]> {
    return this.records
      .filter((r) => r.ownerId === ownerId && r.customerId === customerId)
      .map((r) => ({
        id: r.id,
        title: r.title,
        value: r.value,
        stage: r.stage,
        expectedCloseDate: r.expectedCloseDate,
      }))
  }

  async findForUser(id: string, ownerId: string): Promise<DealRecord | null> {
    const found = this.records.find((r) => r.id === id && r.ownerId === ownerId)
    if (!found) return null
    return {
      id: found.id,
      title: found.title,
      value: found.value,
      stage: found.stage,
      expectedCloseDate: found.expectedCloseDate,
      customer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async updateForUser(): Promise<DealRecord | null> { return null }
  async deleteForUser(): Promise<boolean> { return false }
}

interface MemoryTaskItem {
  id: string
  ownerId: string
  customerId: string | null
  title: string
  dueDate: Date
  priority: TaskPriority
  completed: boolean
}

class MemoryTaskRepository implements TaskRepository {
  private records: MemoryTaskItem[] = []
  private nextId = 1

  async addTestTask(item: Omit<MemoryTaskItem, 'id'>): Promise<MemoryTaskItem> {
    const id = `task_${(this.nextId++).toString(16).padStart(8, '0')}`
    const record = { ...item, id }
    this.records.push(record)
    return record
  }

  async create(ownerId: string, data: TaskData): Promise<TaskRecord> {
    const item = await this.addTestTask({
      ownerId,
      customerId: data.customer ?? null,
      title: data.title,
      dueDate: data.dueDate,
      priority: data.priority,
      completed: false,
    })
    return {
      id: item.id,
      title: item.title,
      dueDate: item.dueDate,
      priority: item.priority,
      completed: item.completed,
      overdue: false,
      customer: null,
      deal: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  async list(ownerId: string): Promise<TaskRecord[]> {
    return this.records
      .filter((r) => r.ownerId === ownerId)
      .map((r) => ({
        id: r.id,
        title: r.title,
        dueDate: r.dueDate,
        priority: r.priority,
        completed: r.completed,
        overdue: false,
        customer: null,
        deal: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
  }

  async listForCustomer(ownerId: string, customerId: string): Promise<CustomerRelatedTask[]> {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return this.records
      .filter((r) => r.ownerId === ownerId && r.customerId === customerId)
      .map((r) => ({
        id: r.id,
        title: r.title,
        dueDate: r.dueDate,
        priority: r.priority,
        completed: r.completed,
        overdue: !r.completed && r.dueDate < today,
      }))
  }

  async findForUser(): Promise<TaskRecord | null> { return null }
  async updateForUser(): Promise<TaskRecord | null> { return null }
  async deleteForUser(): Promise<boolean> { return false }
}

let createApp: (options?: AppOptions) => Application
let createAuthToken: (userId: string) => string
let app: Application
let customers: MemoryCustomerRepository
let deals: MemoryDealRepository
let tasks: MemoryTaskRepository

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
  deals = new MemoryDealRepository()
  tasks = new MemoryTaskRepository()
  app = createApp({
    userRepository: new MemoryUserRepository(),
    customerRepository: customers,
    dealRepository: deals,
    taskRepository: tasks,
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

test('customer detail returns related deals', async () => {
  const customer = await customers.create(firstUserId, customerInput)
  await deals.addTestDeal({
    ownerId: firstUserId,
    customerId: customer.id,
    title: 'Commercial Expansion',
    value: 50000,
    stage: 'Proposal',
    expectedCloseDate: new Date('2026-11-15T00:00:00.000Z'),
  })

  const response = await authenticatedGet(`/api/customers/${customer.id}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.related.deals.length, 1)
  assert.equal(response.body.related.deals[0].title, 'Commercial Expansion')
  assert.equal(response.body.related.deals[0].value, 50000)
  assert.equal(response.body.related.deals[0].stage, 'Proposal')
})

test('customer detail returns related tasks', async () => {
  const customer = await customers.create(firstUserId, customerInput)
  await tasks.addTestTask({
    ownerId: firstUserId,
    customerId: customer.id,
    title: 'Send follow-up contract',
    dueDate: new Date('2026-10-20T00:00:00.000Z'),
    priority: 'High',
    completed: false,
  })

  const response = await authenticatedGet(`/api/customers/${customer.id}`)

  assert.equal(response.status, 200)
  assert.equal(response.body.related.tasks.length, 1)
  assert.equal(response.body.related.tasks[0].title, 'Send follow-up contract')
  assert.equal(response.body.related.tasks[0].priority, 'High')
  assert.equal(response.body.related.tasks[0].completed, false)
})

test('only records belonging to the requested customer are returned', async () => {
  const customerA = await customers.create(firstUserId, customerInput)
  const customerB = await customers.create(firstUserId, { ...customerInput, email: 'b@example.com', name: 'Customer B' })

  await deals.addTestDeal({
    ownerId: firstUserId,
    customerId: customerA.id,
    title: 'Deal for A',
    value: 10000,
    stage: 'Lead',
    expectedCloseDate: new Date('2026-11-01T00:00:00.000Z'),
  })
  await deals.addTestDeal({
    ownerId: firstUserId,
    customerId: customerB.id,
    title: 'Deal for B',
    value: 20000,
    stage: 'Qualified',
    expectedCloseDate: new Date('2026-11-02T00:00:00.000Z'),
  })

  await tasks.addTestTask({
    ownerId: firstUserId,
    customerId: customerA.id,
    title: 'Task for A',
    dueDate: new Date('2026-10-25T00:00:00.000Z'),
    priority: 'Medium',
    completed: false,
  })
  await tasks.addTestTask({
    ownerId: firstUserId,
    customerId: customerB.id,
    title: 'Task for B',
    dueDate: new Date('2026-10-26T00:00:00.000Z'),
    priority: 'Low',
    completed: false,
  })

  const responseA = await authenticatedGet(`/api/customers/${customerA.id}`)
  assert.equal(responseA.status, 200)
  assert.equal(responseA.body.related.deals.length, 1)
  assert.equal(responseA.body.related.deals[0].title, 'Deal for A')
  assert.equal(responseA.body.related.tasks.length, 1)
  assert.equal(responseA.body.related.tasks[0].title, 'Task for A')

  const responseB = await authenticatedGet(`/api/customers/${customerB.id}`)
  assert.equal(responseB.status, 200)
  assert.equal(responseB.body.related.deals.length, 1)
  assert.equal(responseB.body.related.deals[0].title, 'Deal for B')
  assert.equal(responseB.body.related.tasks.length, 1)
  assert.equal(responseB.body.related.tasks[0].title, 'Task for B')
})

test("another user's related deal is NOT returned", async () => {
  const customer = await customers.create(firstUserId, customerInput)

  await deals.addTestDeal({
    ownerId: secondUserId,
    customerId: customer.id,
    title: 'Foreign Secret Deal',
    value: 99999,
    stage: 'Won',
    expectedCloseDate: new Date('2026-12-01T00:00:00.000Z'),
  })

  const response = await authenticatedGet(`/api/customers/${customer.id}`)
  assert.equal(response.status, 200)
  assert.equal(response.body.related.deals.length, 0)
})

test("another user's related task is NOT returned", async () => {
  const customer = await customers.create(firstUserId, customerInput)

  await tasks.addTestTask({
    ownerId: secondUserId,
    customerId: customer.id,
    title: 'Foreign Secret Task',
    dueDate: new Date('2026-12-01T00:00:00.000Z'),
    priority: 'High',
    completed: false,
  })

  const response = await authenticatedGet(`/api/customers/${customer.id}`)
  assert.equal(response.status, 200)
  assert.equal(response.body.related.tasks.length, 0)
})