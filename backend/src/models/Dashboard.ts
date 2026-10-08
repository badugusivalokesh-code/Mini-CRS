import { models, Types, type Model } from 'mongoose'
import './Customer'
import './Deal'
import './Task'

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface PipelineStageValue {
  stage: string
  value: number
  count: number
}

export interface DashboardData {
  totalCustomers: number
  openPipelineValue: number
  dealsWonThisMonth: number
  tasksDueToday: number
  overdueTasks: number
  pipelineByStage: PipelineStageValue[]
}

export interface DashboardRepository {
  getDashboard(ownerId: string): Promise<DashboardData>
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function utcStartOfToday(): Date {
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  return now
}

export function utcStartOfThisMonth(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function utcStartOfNextMonth(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

// ─── Pipeline stage definitions ───────────────────────────────────────────────

export const ALL_PIPELINE_STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const
export const OPEN_PIPELINE_STAGES = ['Lead', 'Qualified', 'Proposal'] as const

export function buildCustomerDashboardPipeline(ownerId: Types.ObjectId) {
  return [
    { $match: { user: ownerId } },
    { $count: 'totalCustomers' },
  ]
}

export function buildDealDashboardPipeline(
  ownerId: Types.ObjectId,
  monthStart: Date,
  nextMonthStart: Date,
) {
  return [
    { $match: { user: ownerId } },
    {
      $facet: {
        summary: [
          {
            $group: {
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
            },
          },
          { $project: { _id: 0, openPipelineValue: 1, dealsWonThisMonth: 1 } },
        ],
        pipelineByStage: [
          {
            $group: {
              _id: '$stage',
              value: { $sum: '$value' },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]
}

export function buildTaskDashboardPipeline(
  ownerId: Types.ObjectId,
  today: Date,
  tomorrow: Date,
) {
  return [
    { $match: { user: ownerId, completed: false } },
    {
      $group: {
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
      },
    },
    { $project: { _id: 0, tasksDueToday: 1, overdueTasks: 1 } },
  ]
}

interface CustomerDashboardAggregation {
  totalCustomers: number
}

interface DealDashboardAggregation {
  summary: Array<{ openPipelineValue: number; dealsWonThisMonth: number }>
  pipelineByStage: Array<{ _id: string; value: number; count: number }>
}

interface TaskDashboardAggregation {
  tasksDueToday: number
  overdueTasks: number
}

export function mapDashboardAggregationResults(
  customerResult: CustomerDashboardAggregation[],
  dealResult: DealDashboardAggregation[],
  taskResult: TaskDashboardAggregation[],
): DashboardData {
  const dealSummary = dealResult[0]?.summary[0]
  const taskSummary = taskResult[0]
  const stageMap = new Map<string, PipelineStageValue>(
    (dealResult[0]?.pipelineByStage ?? []).map((stage) => [
      stage._id,
      { stage: stage._id, value: stage.value, count: stage.count },
    ]),
  )
  const pipelineByStage = ALL_PIPELINE_STAGES.map((stage) =>
    stageMap.get(stage) ?? { stage, value: 0, count: 0 },
  )

  return {
    totalCustomers: customerResult[0]?.totalCustomers ?? 0,
    openPipelineValue: dealSummary?.openPipelineValue ?? 0,
    dealsWonThisMonth: dealSummary?.dealsWonThisMonth ?? 0,
    tasksDueToday: taskSummary?.tasksDueToday ?? 0,
    overdueTasks: taskSummary?.overdueTasks ?? 0,
    pipelineByStage,
  }
}

// ─── Lazy model references ────────────────────────────────────────────────────

function customerModel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return models.Customer as Model<any>
}

function dealModel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return models.Deal as Model<any>
}

function taskModel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return models.Task as Model<any>
}

// ─── Mongoose aggregation repository ─────────────────────────────────────────

export const mongooseDashboardRepository: DashboardRepository = {
  async getDashboard(ownerId: string): Promise<DashboardData> {
    const userObjectId = new Types.ObjectId(ownerId)
    const today = utcStartOfToday()
    const tomorrow = new Date(today.getTime() + 86_400_000)
    const monthStart = utcStartOfThisMonth()
    const nextMonthStart = utcStartOfNextMonth()

    const [
      customerResult,
      dealResult,
      taskResult,
    ] = await Promise.all([
      customerModel().aggregate<{ totalCustomers: number }>(
        buildCustomerDashboardPipeline(userObjectId),
      ).exec(),
      dealModel().aggregate<{
        summary: Array<{ openPipelineValue: number; dealsWonThisMonth: number }>
        pipelineByStage: Array<{ _id: string; value: number; count: number }>
      }>(buildDealDashboardPipeline(userObjectId, monthStart, nextMonthStart)).exec(),
      taskModel().aggregate<{
        tasksDueToday: number
        overdueTasks: number
      }>(buildTaskDashboardPipeline(userObjectId, today, tomorrow)).exec(),
    ])

    return mapDashboardAggregationResults(customerResult, dealResult, taskResult)
  },
}
