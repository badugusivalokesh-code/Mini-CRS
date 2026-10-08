import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import type { Application } from 'express'
import request from 'supertest'
import type { CustomerListResult, CustomerRecord, CustomerRepository } from '../src/models/Customer'
import type { DealRecord, DealRepository } from '../src/models/Deal'
import type { TaskRecord, TaskRepository } from '../src/models/Task'
import type { UserRecord, UserRepository } from '../src/models/User'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../src/validation/customerSchemas'
import type { DealData, DealStage, DealUpdate } from '../src/validation/dealSchemas'
import type { TaskData, TaskUpdate } from '../src/validation/taskSchemas'

const ownerId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const otherUserId = 'bbbbbbbbbbbbbbbbbbbbbbbb'
const customerId = '111111111111111111111111'
const foreignCustomerId = '222222222222222222222222'
const dealId = '333333333333333333333333'
const foreignDealId = '444444444444444444444444'
const taskId = '555555555555555555555555'
const foreignTaskId = '666666666666666666666666'

class MemoryUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    return email === 'owner@example.com'
      ? { id: ownerId, email }
      : email === 'other@example.com'
        ? { id: otherUserId, email }
        : null
  }

  async findById(id: string): Promise<UserRecord | null> {
    return id === ownerId
      ? { id, email: 'owner@example.com' }
      : id === otherUserId
        ? { id, email: 'other@example.com' }
        : null
  }

  async create(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    return { id: ownerId, ...input }
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

class MemoryCustomerRepository implements CustomerRepository {
  private readonly records = new Map<string, CustomerRecord & { ownerId: string }>([
    [customerId, { ...customerInput, id: customerId, ownerId, createdAt: new Date(), updatedAt: new Date() }],
    [foreignCustomerId, {
      ...customerInput,
      id: foreignCustomerId,
      ownerId: otherUserId,
      email: 'foreign@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
  ])

  async create(_ownerId: string, data: CustomerData): Promise<CustomerRecord> {
    return { ...data, id: customerId, createdAt: new Date(), updatedAt: new Date() }
  }

  async list(_ownerId: string, _query: CustomerListQuery): Promise<CustomerListResult> {
    void _ownerId
    void _query
    return { customers: [], total: 0 }
  }

  async findForUser(id: string, userId: string): Promise<CustomerRecord | null> {
    const record = this.records.get(id)
    if (!record || record.ownerId !== userId) return null
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

  async updateForUser(_id: string, _ownerId: string, _data: CustomerUpdate): Promise<CustomerRecord | null> {
    void _id
    void _ownerId
    void _data
    return null
  }

  async deleteForUser(_id: string, _ownerId: string): Promise<boolean> {
    void _id
    void _ownerId
    return false
  }
}

const dealTemplate: DealRecord = {
  id: dealId,
  title: 'Northstar Renovation',
  value: 12500,
  stage: 'Lead',
  expectedCloseDate: new Date('2027-03-18T00:00:00.000Z'),
  customer: { id: customerId, name: customerInput.name, company: customerInput.company, email: customerInput.email },
  createdAt: new Date(),
  updatedAt: new Date(),
}

class MemoryDealRepository implements DealRepository {
  async create(_ownerId: string, data: DealData): Promise<DealRecord> {
    return { ...dealTemplate, ...data, id: dealId }
  }

  async list(_ownerId: string, _stage?: DealStage): Promise<DealRecord[]> {
    void _ownerId
    void _stage
    return [dealTemplate]
  }

  async findForUser(id: string, userId: string): Promise<DealRecord | null> {
    if (id === dealId && userId === ownerId) return dealTemplate
    if (id === foreignDealId && userId === otherUserId) return { ...dealTemplate, id: foreignDealId }
    return null
  }

  async updateForUser(_id: string, _ownerId: string, _data: DealUpdate): Promise<DealRecord | null> {
    void _id
    void _ownerId
    void _data
    return null
  }

  async deleteForUser(_id: string, _ownerId: string): Promise<boolean> {
    void _id
    void _ownerId
    return false
  }
}

class MemoryTaskRepository implements TaskRepository {
  private readonly records = new Map<string, TaskRecord & { ownerId: string }>()
  private nextId = 1

  constructor(
    private readonly customers: CustomerRepository,
    private readonly deals: DealRepository,
  ) {}

  async create(userId: string, data: TaskData): Promise<TaskRecord> {
    const id = this.nextId === 1 ? taskId : this.nextId.toString(16).padStart(24, '0')
    this.nextId += 1
    const now = new Date()
    const task = {
      id,
      ownerId: userId,
      title: data.title,
      dueDate: data.dueDate,
      priority: data.priority,
      completed: data.completed ?? false,
      overdue: false,
      customer: data.customer ? await this.customerSummary(data.customer, userId) : null,
      deal: data.deal ? await this.dealSummary(data.deal, userId) : null,
      createdAt: now,
      updatedAt: now,
    }
    this.records.set(id, task)
    return this.publicRecord(task)
  }

  async list(userId: string): Promise<TaskRecord[]> {
    return [...this.records.values()]
      .filter((task) => task.ownerId === userId)
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
      .map((task) => this.publicRecord(task))
  }

  async findForUser(id: string, userId: string): Promise<TaskRecord | null> {
    const task = this.records.get(id)
    return task?.ownerId === userId ? this.publicRecord(task) : null
  }

  async updateForUser(id: string, userId: string, data: TaskUpdate): Promise<TaskRecord | null> {
    const task = this.records.get(id)
    if (!task || task.ownerId !== userId) return null
    if ('customer' in data) task.customer = data.customer ? await this.customerSummary(data.customer, userId) : null
    if ('deal' in data) task.deal = data.deal ? await this.dealSummary(data.deal, userId) : null
    Object.assign(task, data, { updatedAt: new Date() })
    return this.publicRecord(task)
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const task = this.records.get(id)
    return Boolean(task && task.ownerId === userId && this.records.delete(id))
  }

  async seedForeignTask(): Promise<void> {
    const now = new Date()
    this.records.set(foreignTaskId, {
      id: foreignTaskId,
      ownerId: otherUserId,
      title: 'Private task',
      dueDate: new Date('2027-01-01T00:00:00.000Z'),
      priority: 'Low',
      completed: false,
      overdue: false,
      customer: null,
      deal: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  private async customerSummary(id: string, userId: string) {
    const customer = await this.customers.findForUser(id, userId)
    if (!customer) throw new Error('Customer missing from test repository')
    return { id: customer.id, name: customer.name, company: customer.company, email: customer.email }
  }

  private async dealSummary(id: string, userId: string) {
    const deal = await this.deals.findForUser(id, userId)
    if (!deal) throw new Error('Deal missing from test repository')
    return { id: deal.id, title: deal.title, value: deal.value, stage: deal.stage }
  }

  private publicRecord(task: TaskRecord & { ownerId: string }): TaskRecord {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
      overdue: !task.completed && task.dueDate.getTime() < today.getTime(),
      customer: task.customer,
      deal: task.deal,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }
  }
}

let createApp: (options?: {
  userRepository?: UserRepository
  customerRepository?: CustomerRepository
  dealRepository?: DealRepository
  taskRepository?: TaskRepository
}) => Application
let createAuthToken: (userId: string) => string
let app: Application
let tasks: MemoryTaskRepository

before(async () => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mini-crm-test'
  process.env.JWT_SECRET = 'test-only-tasks-api-secret'
  process.env.CLIENT_URL = 'http://localhost:5173'
  process.env.NODE_ENV = 'test'
  ;({ createApp } = await import('../src/app'))
  ;({ createAuthToken } = await import('../src/utils/authToken'))
})

beforeEach(() => {
  const customers = new MemoryCustomerRepository()
  const deals = new MemoryDealRepository()
  tasks = new MemoryTaskRepository(customers, deals)
  app = createApp({
    userRepository: new MemoryUserRepository(),
    customerRepository: customers,
    dealRepository: deals,
    taskRepository: tasks,
  })
})

function authCookie(userId = ownerId): string {
  return `mini_crm_auth=${createAuthToken(userId)}`
}

function taskInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Prepare proposal',
    dueDate: '2027-03-18',
    priority: 'High',
    customer: customerId,
    deal: dealId,
    ...overrides,
  }
}

async function createOwnedTask(input = taskInput()): Promise<{ id: string }> {
  const response = await request(app).post('/api/tasks').set('Cookie', authCookie()).send(input)
  assert.equal(response.status, 201)
  return response.body.task as { id: string }
}

test('authenticated user can create and list owned tasks with customer and deal summaries', async () => {
  const created = await request(app).post('/api/tasks').set('Cookie', authCookie()).send(taskInput())
  await tasks.seedForeignTask()
  const listed = await request(app).get('/api/tasks').set('Cookie', authCookie())

  assert.equal(created.status, 201)
  assert.equal(created.body.task.completed, false)
  assert.equal(created.body.task.customer.id, customerId)
  assert.equal(created.body.task.deal.id, dealId)
  assert.equal(listed.status, 200)
  assert.equal(listed.body.tasks.length, 1)
  assert.equal(listed.body.tasks[0].title, 'Prepare proposal')
})

test('task endpoints reject unauthenticated access', async () => {
  const task = await createOwnedTask()
  const responses = await Promise.all([
    request(app).get('/api/tasks'),
    request(app).post('/api/tasks').send(taskInput()),
    request(app).get(`/api/tasks/${task.id}`),
    request(app).patch(`/api/tasks/${task.id}`).send({ completed: true }),
    request(app).delete(`/api/tasks/${task.id}`),
  ])
  assert.deepEqual(responses.map((response) => response.status), [401, 401, 401, 401, 401])
})

test('user can retrieve their task and invalid or missing IDs return 404', async () => {
  const task = await createOwnedTask()
  assert.equal((await request(app).get(`/api/tasks/${task.id}`).set('Cookie', authCookie())).status, 200)
  assert.equal((await request(app).get('/api/tasks/not-an-id').set('Cookie', authCookie())).status, 404)
  assert.equal((await request(app).get('/api/tasks/999999999999999999999999').set('Cookie', authCookie())).status, 404)
  assert.equal((await request(app).patch('/api/tasks/not-an-id').set('Cookie', authCookie()).send({ completed: true })).status, 404)
  assert.equal((await request(app).delete('/api/tasks/not-an-id').set('Cookie', authCookie())).status, 404)
})

test('user can update task details and toggle done state both ways', async () => {
  const task = await createOwnedTask()
  const update = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ title: 'Send revised proposal', priority: 'Medium' })
  const complete = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ completed: true })
  const reopen = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ completed: false })

  assert.equal(update.status, 200)
  assert.equal(update.body.task.title, 'Send revised proposal')
  assert.equal(update.body.task.priority, 'Medium')
  assert.equal(complete.body.task.completed, true)
  assert.equal(reopen.body.task.completed, false)
})

test('user can delete their task', async () => {
  const task = await createOwnedTask()
  assert.equal((await request(app).delete(`/api/tasks/${task.id}`).set('Cookie', authCookie())).status, 200)
  assert.equal((await request(app).get(`/api/tasks/${task.id}`).set('Cookie', authCookie())).status, 404)
})

test('overdue is derived from the due date and completed tasks are never overdue', async () => {
  const task = await createOwnedTask(taskInput({ dueDate: '2000-01-01', customer: null, deal: null }))
  const overdue = await request(app).get(`/api/tasks/${task.id}`).set('Cookie', authCookie())
  assert.equal(overdue.body.task.overdue, true)

  const completed = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ completed: true })
  assert.equal(completed.body.task.overdue, false)
})

test('a task due today is not overdue', async () => {
  const today = new Date().toISOString().slice(0, 10)
  const task = await createOwnedTask(taskInput({ dueDate: today, customer: null, deal: null }))
  const response = await request(app).get(`/api/tasks/${task.id}`).set('Cookie', authCookie())
  assert.equal(response.body.task.overdue, false)
})

test('invalid fields, missing required data, dates, priority, and client ownership return 400', async () => {
  const missing = await request(app).post('/api/tasks').set('Cookie', authCookie()).send({ title: 'Missing fields' })
  const emptyTitle = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ title: '  ' }))
  const badDate = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ dueDate: 'not-a-date' }))
  const nullDate = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ dueDate: null }))
  const badPriority = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ priority: 'Urgent' }))
  const clientOwner = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ user: otherUserId }))

  for (const response of [missing, emptyTitle, badDate, nullDate, badPriority, clientOwner]) {
    assert.equal(response.status, 400)
  }
})

test('empty updates, invalid values, and query parameters return 400', async () => {
  const task = await createOwnedTask()
  const empty = await request(app).patch(`/api/tasks/${task.id}`).set('Cookie', authCookie()).send({})
  const invalid = await request(app).patch(`/api/tasks/${task.id}`).set('Cookie', authCookie())
    .send({ priority: 'Urgent' })
  const badQuery = await request(app).get('/api/tasks?completed=yes').set('Cookie', authCookie())
  assert.equal(empty.status, 400)
  assert.equal(invalid.status, 400)
  assert.equal(badQuery.status, 400)
})

test('another user cannot view, update, or delete a task', async () => {
  await tasks.seedForeignTask()
  const view = await request(app).get(`/api/tasks/${foreignTaskId}`).set('Cookie', authCookie())
  const update = await request(app).patch(`/api/tasks/${foreignTaskId}`)
    .set('Cookie', authCookie())
    .send({ completed: true })
  const remove = await request(app).delete(`/api/tasks/${foreignTaskId}`).set('Cookie', authCookie())
  assert.equal(view.status, 404)
  assert.equal(update.status, 404)
  assert.equal(remove.status, 404)
  assert.equal((await tasks.findForUser(foreignTaskId, otherUserId))?.completed, false)
})

test('invalid, missing, and foreign customer or deal references return 400', async () => {
  const badCustomer = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ customer: 'invalid' }))
  const missingCustomer = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ customer: '777777777777777777777777' }))
  const foreignCustomer = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ customer: foreignCustomerId }))
  const badDeal = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ deal: 'invalid' }))
  const missingDeal = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ deal: '888888888888888888888888' }))
  const foreignDeal = await request(app).post('/api/tasks').set('Cookie', authCookie())
    .send(taskInput({ deal: foreignDealId }))

  for (const response of [badCustomer, missingCustomer, foreignCustomer, badDeal, missingDeal, foreignDeal]) {
    assert.equal(response.status, 400)
  }
})

test('updating to a foreign or missing reference returns 400 without mutating task data', async () => {
  const task = await createOwnedTask()
  const foreign = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ priority: 'Low', deal: foreignDealId })
  const missing = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ priority: 'Low', customer: '999999999999999999999999' })
  const unchanged = await request(app).get(`/api/tasks/${task.id}`).set('Cookie', authCookie())

  assert.equal(foreign.status, 400)
  assert.equal(missing.status, 400)
  assert.equal(unchanged.body.task.priority, 'High')
  assert.equal(unchanged.body.task.deal.id, dealId)
})

test('customer and deal relationships can be removed on update', async () => {
  const task = await createOwnedTask()
  const updated = await request(app).patch(`/api/tasks/${task.id}`)
    .set('Cookie', authCookie())
    .send({ customer: null, deal: null })
  assert.equal(updated.status, 200)
  assert.equal(updated.body.task.customer, null)
  assert.equal(updated.body.task.deal, null)
})
