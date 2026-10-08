import assert from 'node:assert/strict'
import { before, beforeEach, test } from 'node:test'
import type { Application } from 'express'
import request from 'supertest'
import type { AppOptions } from '../src/app'
import type { DashboardData, DashboardRepository } from '../src/models/Dashboard'
import {
  ALL_PIPELINE_STAGES,
  OPEN_PIPELINE_STAGES,
  buildCustomerDashboardPipeline,
  buildDealDashboardPipeline,
  buildTaskDashboardPipeline,
  mapDashboardAggregationResults,
  utcStartOfNextMonth,
  utcStartOfThisMonth,
  utcStartOfToday,
} from '../src/models/Dashboard'
import type { UserRecord, UserRepository } from '../src/models/User'
import { Types } from 'mongoose'

const ownerId = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const otherUserId = 'bbbbbbbbbbbbbbbbbbbbbbbb'

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

interface TestCustomer {
  id: string
  ownerId: string
  name: string
}

interface TestDeal {
  id: string
  ownerId: string
  title: string
  value: number
  stage: 'Lead' | 'Qualified' | 'Proposal' | 'Won' | 'Lost'
  expectedCloseDate: Date
}

interface TestTask {
  id: string
  ownerId: string
  title: string
  dueDate: Date
  completed: boolean
}

class MemoryDashboardRepository implements DashboardRepository {
  public customers: TestCustomer[] = []
  public deals: TestDeal[] = []
  public tasks: TestTask[] = []

  async getDashboard(userId: string): Promise<DashboardData> {
    const today = utcStartOfToday()
    const tomorrow = new Date(today.getTime() + 86_400_000)
    const monthStart = utcStartOfThisMonth()
    const nextMonthStart = utcStartOfNextMonth()

    const userCustomers = this.customers.filter((c) => c.ownerId === userId)
    const totalCustomers = userCustomers.length

    const userDeals = this.deals.filter((d) => d.ownerId === userId)

    const openPipelineValue = userDeals
      .filter((d) => (OPEN_PIPELINE_STAGES as readonly string[]).includes(d.stage))
      .reduce((sum, d) => sum + d.value, 0)

    const dealsWonThisMonth = userDeals.filter(
      (d) => d.stage === 'Won' && d.expectedCloseDate >= monthStart && d.expectedCloseDate < nextMonthStart,
    ).length

    const userTasks = this.tasks.filter((t) => t.ownerId === userId)

    const tasksDueToday = userTasks.filter(
      (t) => !t.completed && t.dueDate >= today && t.dueDate < tomorrow,
    ).length

    const overdueTasks = userTasks.filter(
      (t) => !t.completed && t.dueDate < today,
    ).length

    const stageMap = new Map<string, { value: number; count: number }>()
    for (const stage of ALL_PIPELINE_STAGES) {
      stageMap.set(stage, { value: 0, count: 0 })
    }

    for (const deal of userDeals) {
      const existing = stageMap.get(deal.stage)
      if (existing) {
        existing.value += deal.value
        existing.count += 1
      }
    }

    const pipelineByStage = ALL_PIPELINE_STAGES.map((stage) => {
      const entry = stageMap.get(stage) ?? { value: 0, count: 0 }
      return { stage, value: entry.value, count: entry.count }
    })

    return {
      totalCustomers,
      openPipelineValue,
      dealsWonThisMonth,
      tasksDueToday,
      overdueTasks,
      pipelineByStage,
    }
  }
}

let createApp: (options?: AppOptions) => Application
let createAuthToken: (userId: string) => string
let app: Application
let dashboardRepo: MemoryDashboardRepository

before(async () => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/mini-crm-test'
  process.env.JWT_SECRET = 'test-only-dashboard-api-secret'
  process.env.CLIENT_URL = 'http://localhost:5173'
  process.env.NODE_ENV = 'test'
  ;({ createApp } = await import('../src/app'))
  ;({ createAuthToken } = await import('../src/utils/authToken'))
})

beforeEach(() => {
  dashboardRepo = new MemoryDashboardRepository()
  app = createApp({
    userRepository: new MemoryUserRepository(),
    dashboardRepository: dashboardRepo,
  })
})

function authCookie(userId = ownerId): string {
  return `mini_crm_auth=${createAuthToken(userId)}`
}

test('dashboard endpoints reject unauthenticated requests (401)', async () => {
  const response = await request(app).get('/api/dashboard')
  assert.equal(response.status, 401)
  assert.match(response.body.message, /authentication/i)
})

test('dashboard endpoints reject invalid or malformed tokens (401)', async () => {
  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', 'mini_crm_auth=invalid.token.signature')
  assert.equal(response.status, 401)
})

test('authenticated dashboard request succeeds (200) and returns empty/zero data when database is empty', async () => {
  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.ok(response.body.dashboard)
  const { dashboard } = response.body
  assert.equal(dashboard.totalCustomers, 0)
  assert.equal(dashboard.openPipelineValue, 0)
  assert.equal(dashboard.dealsWonThisMonth, 0)
  assert.equal(dashboard.tasksDueToday, 0)
  assert.equal(dashboard.overdueTasks, 0)
  assert.equal(dashboard.pipelineByStage.length, 5)
  for (const item of dashboard.pipelineByStage) {
    assert.equal(item.value, 0)
    assert.equal(item.count, 0)
  }
})

test('total customer count is correctly computed and scoped to authenticated user', async () => {
  dashboardRepo.customers = [
    { id: 'c1', ownerId, name: 'Customer 1' },
    { id: 'c2', ownerId, name: 'Customer 2' },
    { id: 'c3', ownerId: otherUserId, name: 'Foreign Customer' },
  ]

  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.equal(response.body.dashboard.totalCustomers, 2)
})

test('open pipeline value sums only open stages (Lead, Qualified, Proposal) for the user', async () => {
  const today = utcStartOfToday()
  dashboardRepo.deals = [
    { id: 'd1', ownerId, title: 'Lead Deal', value: 10000, stage: 'Lead', expectedCloseDate: today },
    { id: 'd2', ownerId, title: 'Qualified Deal', value: 25000, stage: 'Qualified', expectedCloseDate: today },
    { id: 'd3', ownerId, title: 'Proposal Deal', value: 15000, stage: 'Proposal', expectedCloseDate: today },
    { id: 'd4', ownerId, title: 'Won Deal', value: 50000, stage: 'Won', expectedCloseDate: today },
    { id: 'd5', ownerId, title: 'Lost Deal', value: 20000, stage: 'Lost', expectedCloseDate: today },
    { id: 'd6', ownerId: otherUserId, title: 'Foreign Lead', value: 90000, stage: 'Lead', expectedCloseDate: today },
  ]

  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  // 10000 + 25000 + 15000 = 50000; Won, Lost, and Foreign are excluded
  assert.equal(response.body.dashboard.openPipelineValue, 50000)
})

test('deals won this month counts Won deals whose expectedCloseDate falls in the current month', async () => {
  const monthStart = utcStartOfThisMonth()
  const nextMonthStart = utcStartOfNextMonth()
  // A date clearly in the previous calendar month
  const prevMonthDate = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 15))
  // A date clearly in the next calendar month
  const nextMonthDate = new Date(nextMonthStart.getTime() + 86_400_000)
  // A date within the current month (but not the 1st, to avoid any edge)
  const midMonthDate = new Date(monthStart.getTime() + 86_400_000 * 5)

  dashboardRepo.deals = [
    // ✓ Should be counted — expectedCloseDate is the first moment of this month
    { id: 'd1', ownerId, title: 'Won at month start', value: 10000, stage: 'Won', expectedCloseDate: monthStart },
    // ✓ Should be counted — expectedCloseDate is mid-month
    { id: 'd2', ownerId, title: 'Won mid month', value: 20000, stage: 'Won', expectedCloseDate: midMonthDate },
    // ✗ Should NOT be counted — expectedCloseDate is in the previous month
    { id: 'd3', ownerId, title: 'Won previous month', value: 30000, stage: 'Won', expectedCloseDate: prevMonthDate },
    // ✗ Should NOT be counted — expectedCloseDate is in the next month
    { id: 'd4', ownerId, title: 'Won next month', value: 35000, stage: 'Won', expectedCloseDate: nextMonthDate },
    // ✗ Should NOT be counted — stage is Proposal, not Won
    { id: 'd5', ownerId, title: 'Proposal this month', value: 40000, stage: 'Proposal', expectedCloseDate: monthStart },
    // ✗ Should NOT be counted — belongs to a different user
    { id: 'd6', ownerId: otherUserId, title: 'Foreign won this month', value: 50000, stage: 'Won', expectedCloseDate: monthStart },
  ]

  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  // Only d1 and d2 qualify: Won + expectedCloseDate in current month + owned by requesting user
  assert.equal(response.body.dashboard.dealsWonThisMonth, 2)
})

test('tasks due today is correctly computed and excludes completed tasks', async () => {
  const today = utcStartOfToday()
  const tomorrow = new Date(today.getTime() + 86_400_000)

  dashboardRepo.tasks = [
    { id: 't1', ownerId, title: 'Due today active', dueDate: today, completed: false },
    { id: 't2', ownerId, title: 'Due today completed', dueDate: today, completed: true },
    { id: 't3', ownerId, title: 'Due tomorrow active', dueDate: tomorrow, completed: false },
    { id: 't4', ownerId: otherUserId, title: 'Foreign due today', dueDate: today, completed: false },
  ]

  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.equal(response.body.dashboard.tasksDueToday, 1)
})

test('overdue tasks count includes incomplete tasks before today and excludes completed tasks', async () => {
  const today = utcStartOfToday()
  const yesterday = new Date(today.getTime() - 86_400_000)

  dashboardRepo.tasks = [
    { id: 't1', ownerId, title: 'Overdue incomplete', dueDate: yesterday, completed: false },
    { id: 't2', ownerId, title: 'Overdue but completed', dueDate: yesterday, completed: true },
    { id: 't3', ownerId, title: 'Due today incomplete', dueDate: today, completed: false },
    { id: 't4', ownerId: otherUserId, title: 'Foreign overdue', dueDate: yesterday, completed: false },
  ]

  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  assert.equal(response.body.dashboard.overdueTasks, 1)
})

test('pipeline values by stage return all 5 stages with proper value and count aggregates', async () => {
  const today = utcStartOfToday()
  dashboardRepo.deals = [
    { id: 'd1', ownerId, title: 'Lead 1', value: 12000, stage: 'Lead', expectedCloseDate: today },
    { id: 'd2', ownerId, title: 'Lead 2', value: 8000, stage: 'Lead', expectedCloseDate: today },
    { id: 'd3', ownerId, title: 'Qualified 1', value: 30000, stage: 'Qualified', expectedCloseDate: today },
    { id: 'd4', ownerId, title: 'Won 1', value: 50000, stage: 'Won', expectedCloseDate: today },
  ]

  const response = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie())

  assert.equal(response.status, 200)
  const { pipelineByStage } = response.body.dashboard
  assert.equal(pipelineByStage.length, 5)

  const lead = pipelineByStage.find((s: { stage: string }) => s.stage === 'Lead')
  assert.deepEqual(lead, { stage: 'Lead', value: 20000, count: 2 })

  const qualified = pipelineByStage.find((s: { stage: string }) => s.stage === 'Qualified')
  assert.deepEqual(qualified, { stage: 'Qualified', value: 30000, count: 1 })

  const proposal = pipelineByStage.find((s: { stage: string }) => s.stage === 'Proposal')
  assert.deepEqual(proposal, { stage: 'Proposal', value: 0, count: 0 })

  const won = pipelineByStage.find((s: { stage: string }) => s.stage === 'Won')
  assert.deepEqual(won, { stage: 'Won', value: 50000, count: 1 })

  const lost = pipelineByStage.find((s: { stage: string }) => s.stage === 'Lost')
  assert.deepEqual(lost, { stage: 'Lost', value: 0, count: 0 })
})

test('another user does not see or affect the authenticated user data (complete user isolation)', async () => {
  const today = utcStartOfToday()
  dashboardRepo.customers = [
    { id: 'c1', ownerId, name: 'Alice' },
    { id: 'c2', ownerId: otherUserId, name: 'Bob' },
  ]
  dashboardRepo.deals = [
    { id: 'd1', ownerId, title: 'Owner Deal', value: 99999, stage: 'Lead', expectedCloseDate: today },
    { id: 'd2', ownerId: otherUserId, title: 'Other Deal', value: 55555, stage: 'Lead', expectedCloseDate: today },
  ]

  const otherResponse = await request(app)
    .get('/api/dashboard')
    .set('Cookie', authCookie(otherUserId))

  assert.equal(otherResponse.status, 200)
  const { dashboard } = otherResponse.body

  assert.equal(dashboard.totalCustomers, 1)
  assert.equal(dashboard.openPipelineValue, 55555)
  assert.equal(dashboard.dealsWonThisMonth, 0)
  assert.equal(dashboard.tasksDueToday, 0)
  assert.equal(dashboard.overdueTasks, 0)
})

test('UTC date boundary helpers compute accurate start-of-day and month intervals', () => {
  const today = utcStartOfToday()
  assert.equal(today.getUTCHours(), 0)
  assert.equal(today.getUTCMinutes(), 0)
  assert.equal(today.getUTCSeconds(), 0)
  assert.equal(today.getUTCMilliseconds(), 0)

  const monthStart = utcStartOfThisMonth()
  assert.equal(monthStart.getUTCDate(), 1)
  assert.equal(monthStart.getUTCHours(), 0)

  const nextMonthStart = utcStartOfNextMonth()
  assert.equal(nextMonthStart.getUTCDate(), 1)
  assert.equal(nextMonthStart.getUTCHours(), 0)
  assert.ok(nextMonthStart.getTime() > monthStart.getTime())
})

test('dashboard MongoDB aggregation pipelines calculate metrics and scope every collection by owner', () => {
  const userObjectId = new Types.ObjectId(ownerId)
  const today = utcStartOfToday()
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const monthStart = utcStartOfThisMonth()
  const nextMonthStart = utcStartOfNextMonth()

  assert.deepEqual(buildCustomerDashboardPipeline(userObjectId), [
    { $match: { user: userObjectId } },
    { $count: 'totalCustomers' },
  ])

  const dealPipeline = buildDealDashboardPipeline(userObjectId, monthStart, nextMonthStart)
  assert.deepEqual(dealPipeline[0], { $match: { user: userObjectId } })
  const dealFacets = dealPipeline[1].$facet
  assert.deepEqual(dealFacets.summary[0].$group, {
    _id: null,
    openPipelineValue: {
      $sum: {
        $cond: [
          { $in: ['$stage', OPEN_PIPELINE_STAGES] },
          '$value',
          0,
        ],
      },
    },
    dealsWonThisMonth: {
      $sum: {
        $cond: [
          {
            $and: [
              { $eq: ['$stage', 'Won'] },
              { $gte: ['$expectedCloseDate', monthStart] },
              { $lt: ['$expectedCloseDate', nextMonthStart] },
            ],
          },
          1,
          0,
        ],
      },
    },
  })
  assert.deepEqual(dealFacets.pipelineByStage[0].$group, {
    _id: '$stage',
    value: { $sum: '$value' },
    count: { $sum: 1 },
  })

  const taskPipeline = buildTaskDashboardPipeline(userObjectId, today, tomorrow)
  assert.deepEqual(taskPipeline[0], { $match: { user: userObjectId, completed: false } })
  assert.deepEqual(taskPipeline[1].$group, {
    _id: null,
    tasksDueToday: {
      $sum: {
        $cond: [
          { $and: [{ $gte: ['$dueDate', today] }, { $lt: ['$dueDate', tomorrow] }] },
          1,
          0,
        ],
      },
    },
    overdueTasks: {
      $sum: { $cond: [{ $lt: ['$dueDate', today] }, 1, 0] },
    },
  })
})

test('dashboard aggregation results map to the complete response with zero-filled stages', () => {
  const result = mapDashboardAggregationResults(
    [{ totalCustomers: 3 }],
    [{
      summary: [{ openPipelineValue: 50_000, dealsWonThisMonth: 2 }],
      pipelineByStage: [
        { _id: 'Lead', value: 20_000, count: 2 },
        { _id: 'Qualified', value: 30_000, count: 1 },
        { _id: 'Won', value: 40_000, count: 1 },
      ],
    }],
    [{ tasksDueToday: 1, overdueTasks: 2 }],
  )

  assert.deepEqual(result, {
    totalCustomers: 3,
    openPipelineValue: 50_000,
    dealsWonThisMonth: 2,
    tasksDueToday: 1,
    overdueTasks: 2,
    pipelineByStage: [
      { stage: 'Lead', value: 20_000, count: 2 },
      { stage: 'Qualified', value: 30_000, count: 1 },
      { stage: 'Proposal', value: 0, count: 0 },
      { stage: 'Won', value: 40_000, count: 1 },
      { stage: 'Lost', value: 0, count: 0 },
    ],
  })
})
