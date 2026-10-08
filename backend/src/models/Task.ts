import { isValidObjectId, model, models, Schema, Types, type Model } from 'mongoose'
import type { TaskData, TaskPriority, TaskUpdate } from '../validation/taskSchemas'

export interface TaskCustomerSummary {
  id: string
  name: string
  company: string
  email: string
}

export interface TaskDealSummary {
  id: string
  title: string
  value: number
  stage: string
}

export interface TaskRecord {
  id: string
  title: string
  dueDate: Date
  priority: TaskPriority
  completed: boolean
  overdue: boolean
  customer: TaskCustomerSummary | null
  deal: TaskDealSummary | null
  createdAt: Date
  updatedAt: Date
}

export interface CustomerRelatedTask {
  id: string
  title: string
  dueDate: Date
  priority: TaskPriority
  completed: boolean
  overdue: boolean
}

export interface TaskRepository {
  create(ownerId: string, data: TaskData): Promise<TaskRecord>
  list(ownerId: string): Promise<TaskRecord[]>
  listForCustomer?(ownerId: string, customerId: string): Promise<CustomerRelatedTask[]>
  findForUser(id: string, ownerId: string): Promise<TaskRecord | null>
  updateForUser(id: string, ownerId: string, data: TaskUpdate): Promise<TaskRecord | null>
  deleteForUser(id: string, ownerId: string): Promise<boolean>
}

interface TaskFields {
  title: string
  dueDate: Date
  priority: TaskPriority
  completed: boolean
  customer?: Types.ObjectId | null
  deal?: Types.ObjectId | null
  user: Types.ObjectId
}

interface PopulatedCustomer {
  _id: Types.ObjectId
  name: string
  company: string
  email: string
}

interface PopulatedDeal {
  _id: Types.ObjectId
  title: string
  value: number
  stage: string
}

const taskSchema = new Schema<TaskFields>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    completed: { type: Boolean, required: true, default: false },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    deal: { type: Schema.Types.ObjectId, ref: 'Deal', default: null },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

taskSchema.index({ user: 1, dueDate: 1 })
taskSchema.index({ user: 1, completed: 1, dueDate: 1 })

const Task = (models.Task as Model<TaskFields> | undefined) ?? model<TaskFields>('Task', taskSchema)

type PopulatedTask = {
  _id: Types.ObjectId
  title: string
  dueDate: Date
  priority: TaskPriority
  completed: boolean
  customer: PopulatedCustomer | null
  deal: PopulatedDeal | null
  createdAt: Date
  updatedAt: Date
}

function toTaskRecord(task: PopulatedTask): TaskRecord {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return {
    id: task._id.toString(),
    title: task.title,
    dueDate: task.dueDate,
    priority: task.priority,
    completed: task.completed,
    overdue: !task.completed && task.dueDate.getTime() < today.getTime(),
    customer: task.customer ? {
      id: task.customer._id.toString(),
      name: task.customer.name,
      company: task.customer.company,
      email: task.customer.email,
    } : null,
    deal: task.deal ? {
      id: task.deal._id.toString(),
      title: task.deal.title,
      value: task.deal.value,
      stage: task.deal.stage,
    } : null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

function ownedPopulation(path: 'customer' | 'deal', ownerId: string) {
  return {
    path,
    match: { user: new Types.ObjectId(ownerId) },
  }
}

function populateTask(query: ReturnType<typeof Task.findOne>, ownerId: string) {
  return query
    .populate<{ customer: PopulatedCustomer | null }>({
      ...ownedPopulation('customer', ownerId),
      select: 'name company email',
    })
    .populate<{ deal: PopulatedDeal | null }>({
      ...ownedPopulation('deal', ownerId),
      select: 'title value stage',
    })
}

export const mongooseTaskRepository: TaskRepository = {
  async create(ownerId, data) {
    const task = await Task.create({
      ...data,
      customer: data.customer ? new Types.ObjectId(data.customer) : null,
      deal: data.deal ? new Types.ObjectId(data.deal) : null,
      completed: data.completed ?? false,
      user: new Types.ObjectId(ownerId),
    })
    const populated = await populateTask(Task.findOne({ _id: task._id, user: new Types.ObjectId(ownerId) }), ownerId).exec()
    if (!populated) throw new Error('Created task could not be reloaded')
    return toTaskRecord(populated as unknown as PopulatedTask)
  },

  async list(ownerId) {
    const tasks = await Task.find({ user: new Types.ObjectId(ownerId) })
      .sort({ dueDate: 1, _id: 1 })
      .populate<{ customer: PopulatedCustomer | null }>({
        ...ownedPopulation('customer', ownerId),
        select: 'name company email',
      })
      .populate<{ deal: PopulatedDeal | null }>({
        ...ownedPopulation('deal', ownerId),
        select: 'title value stage',
      })
      .exec()
    return tasks.map((task) => toTaskRecord(task as unknown as PopulatedTask))
  },

  async listForCustomer(ownerId, customerId) {
    if (!isValidObjectId(customerId)) return []
    const tasks = await Task.find({
      user: new Types.ObjectId(ownerId),
      customer: new Types.ObjectId(customerId),
    })
      .sort({ dueDate: 1, _id: 1 })
      .select('_id title dueDate priority completed')
      .lean()
      .exec()

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    return tasks.map((task) => ({
      id: task._id.toString(),
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      completed: task.completed,
      overdue: !task.completed && task.dueDate < today,
    }))
  },

  async findForUser(id, ownerId) {
    if (!isValidObjectId(id)) return null
    const task = await populateTask(
      Task.findOne({ _id: id, user: new Types.ObjectId(ownerId) }),
      ownerId,
    ).exec()
    return task ? toTaskRecord(task as unknown as PopulatedTask) : null
  },

  async updateForUser(id, ownerId, data) {
    if (!isValidObjectId(id)) return null
    const update: Record<string, unknown> = { ...data }
    if ('customer' in data) update.customer = data.customer ? new Types.ObjectId(data.customer) : null
    if ('deal' in data) update.deal = data.deal ? new Types.ObjectId(data.deal) : null
    const task = await populateTask(
      Task.findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(ownerId) },
        { $set: update },
        { new: true, runValidators: true },
      ),
      ownerId,
    ).exec()
    return task ? toTaskRecord(task as unknown as PopulatedTask) : null
  },

  async deleteForUser(id, ownerId) {
    if (!isValidObjectId(id)) return false
    const task = await Task.findOneAndDelete({
      _id: id,
      user: new Types.ObjectId(ownerId),
    }).exec()
    return task !== null
  },
}
