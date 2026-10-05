import { isValidObjectId, model, models, Schema, Types, type Model } from 'mongoose'
import type { CustomerData, CustomerListQuery, CustomerUpdate } from '../validation/customerSchemas'

export interface CustomerRecord extends CustomerData {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomerListResult {
  customers: CustomerRecord[]
  total: number
}

export interface CustomerRepository {
  create(ownerId: string, data: CustomerData): Promise<CustomerRecord>
  list(ownerId: string, query: CustomerListQuery): Promise<CustomerListResult>
  findForUser(id: string, ownerId: string): Promise<CustomerRecord | null>
  updateForUser(id: string, ownerId: string, data: CustomerUpdate): Promise<CustomerRecord | null>
  deleteForUser(id: string, ownerId: string): Promise<boolean>
}

interface CustomerFields extends CustomerData {
  user: Types.ObjectId
}

type CustomerRecordSource = Pick<CustomerFields, 'name' | 'company' | 'email' | 'phone' | 'status' | 'notes'> & {
  _id: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const customerSchema = new Schema<CustomerFields>(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true },
    notes: { type: String, required: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

customerSchema.index({ user: 1, status: 1, createdAt: -1 })
customerSchema.index({ user: 1, createdAt: -1 })

const Customer = (models.Customer as Model<CustomerFields> | undefined)
  ?? model<CustomerFields>('Customer', customerSchema)

function toCustomerRecord(customer: CustomerRecordSource): CustomerRecord {
  return {
    id: customer._id.toString(),
    name: customer.name,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const mongooseCustomerRepository: CustomerRepository = {
  async create(ownerId, data) {
    const customer = await Customer.create({ ...data, user: new Types.ObjectId(ownerId) })
    return toCustomerRecord(customer.toObject() as unknown as CustomerRecordSource)
  },

  async list(ownerId, query) {
    const filter: Record<string, unknown> = { user: new Types.ObjectId(ownerId) }
    if (query.status) filter.status = query.status
    if (query.search) {
      const search = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{ name: search }, { company: search }, { email: search }]
    }

    const skip = (query.page - 1) * query.limit
    const [records, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean()
        .exec(),
      Customer.countDocuments(filter).exec(),
    ])

    return {
      customers: records.map((customer) => toCustomerRecord(customer as unknown as CustomerRecordSource)),
      total,
    }
  },

  async findForUser(id, ownerId) {
    if (!isValidObjectId(id)) return null
    const customer = await Customer.findOne({ _id: id, user: new Types.ObjectId(ownerId) }).exec()
    return customer ? toCustomerRecord(customer.toObject() as unknown as CustomerRecordSource) : null
  },

  async updateForUser(id, ownerId, data) {
    if (!isValidObjectId(id)) return null
    const customer = await Customer.findOneAndUpdate(
      { _id: id, user: new Types.ObjectId(ownerId) },
      { $set: data },
      { new: true, runValidators: true },
    ).exec()
    return customer ? toCustomerRecord(customer.toObject() as unknown as CustomerRecordSource) : null
  },

  async deleteForUser(id, ownerId) {
    if (!isValidObjectId(id)) return false
    const customer = await Customer.findOneAndDelete({
      _id: id,
      user: new Types.ObjectId(ownerId),
    }).exec()
    return customer !== null
  },
}