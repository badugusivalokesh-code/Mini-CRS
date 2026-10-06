import { model, models, Schema, Types, type HydratedDocument, type Model } from 'mongoose'
import type { DealData, DealStage, DealUpdate } from '../validation/dealSchemas'

export interface DealCustomerSummary {
  id: string
  name: string
  company: string
  email: string
}

export interface DealRecord {
  id: string
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: Date
  customer: DealCustomerSummary | null
  createdAt: Date
  updatedAt: Date
}

export interface DealRepository {
  create(ownerId: string, data: DealData): Promise<DealRecord>
  list(ownerId: string, stage?: DealStage): Promise<DealRecord[]>
  findForUser(id: string, ownerId: string): Promise<DealRecord | null>
  updateForUser(id: string, ownerId: string, data: DealUpdate): Promise<DealRecord | null>
  deleteForUser(id: string, ownerId: string): Promise<boolean>
}

interface DealFields {
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: Date
  customer: Types.ObjectId
  user: Types.ObjectId
}

interface PopulatedCustomer {
  _id: Types.ObjectId
  name: string
  company: string
  email: string
}

const dealSchema = new Schema<DealFields>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    value: { type: Number, required: true, min: 0 },
    stage: { type: String, enum: ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'], required: true },
    expectedCloseDate: { type: Date, required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

dealSchema.index({ user: 1, stage: 1, expectedCloseDate: 1 })
dealSchema.index({ user: 1, customer: 1 })

const Deal = (models.Deal as Model<DealFields> | undefined) ?? model<DealFields>('Deal', dealSchema)

type DealRecordSource = Omit<DealFields, 'customer' | 'user'> & {
  _id: Types.ObjectId
  customer: PopulatedCustomer | null
  createdAt: Date
  updatedAt: Date
}

type PopulatedDeal = HydratedDocument<DealFields, { customer: PopulatedCustomer | null }>

function toDealRecord(deal: DealRecordSource): DealRecord {
  return {
    id: deal._id.toString(),
    title: deal.title,
    value: deal.value,
    stage: deal.stage,
    expectedCloseDate: deal.expectedCloseDate,
    customer: deal.customer ? {
      id: deal.customer._id.toString(),
      name: deal.customer.name,
      company: deal.customer.company,
      email: deal.customer.email,
    } : null,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  }
}

function customerPopulation(ownerId: string) {
  return {
    path: 'customer',
    select: 'name company email',
    match: { user: new Types.ObjectId(ownerId) },
  }
}

function toRecord(deal: PopulatedDeal): DealRecord {
  return toDealRecord(deal.toObject() as unknown as DealRecordSource)
}

export const mongooseDealRepository: DealRepository = {
  async create(ownerId, data) {
    const deal = await Deal.create({
      ...data,
      customer: new Types.ObjectId(data.customer),
      user: new Types.ObjectId(ownerId),
    })
    const populated = await Deal.findOne({ _id: deal._id, user: new Types.ObjectId(ownerId) })
      .populate<{ customer: PopulatedCustomer | null }>(customerPopulation(ownerId))
      .exec()
    if (!populated) throw new Error('Created deal could not be reloaded')
    return toRecord(populated as unknown as PopulatedDeal)
  },

  async list(ownerId, stage) {
    const filter: Record<string, unknown> = { user: new Types.ObjectId(ownerId) }
    if (stage) filter.stage = stage
    const deals = await Deal.find(filter)
      .populate<{ customer: PopulatedCustomer | null }>(customerPopulation(ownerId))
      .sort({ expectedCloseDate: 1, _id: 1 })
      .exec()
    return deals.map((deal) => toRecord(deal as unknown as PopulatedDeal))
  },

  async findForUser(id, ownerId) {
    if (!Types.ObjectId.isValid(id)) return null
    const deal = await Deal.findOne({ _id: id, user: new Types.ObjectId(ownerId) })
      .populate<{ customer: PopulatedCustomer | null }>(customerPopulation(ownerId))
      .exec()
    return deal ? toRecord(deal as unknown as PopulatedDeal) : null
  },

  async updateForUser(id, ownerId, data) {
    if (!Types.ObjectId.isValid(id)) return null
    const update: Record<string, unknown> = { ...data }
    if (data.customer) update.customer = new Types.ObjectId(data.customer)
    const deal = await Deal.findOneAndUpdate(
      { _id: id, user: new Types.ObjectId(ownerId) },
      { $set: update },
      { new: true, runValidators: true },
    )
      .populate<{ customer: PopulatedCustomer | null }>(customerPopulation(ownerId))
      .exec()
    return deal ? toRecord(deal as unknown as PopulatedDeal) : null
  },

  async deleteForUser(id, ownerId) {
    if (!Types.ObjectId.isValid(id)) return false
    const deal = await Deal.findOneAndDelete({
      _id: id,
      user: new Types.ObjectId(ownerId),
    }).exec()
    return deal !== null
  },
}