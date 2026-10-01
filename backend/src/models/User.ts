import { model, models, Schema, type HydratedDocument, type Model } from 'mongoose'

export interface UserRecord {
  id: string
  email: string
  passwordHash?: string
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>
  findById(id: string): Promise<UserRecord | null>
  create(user: { email: string; passwordHash: string }): Promise<UserRecord>
}

interface UserFields {
  email: string
  passwordHash: string
}

const userSchema = new Schema<UserFields>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
)

const User = (models.User as Model<UserFields> | undefined) ?? model<UserFields>('User', userSchema)

function toUserRecord(user: HydratedDocument<UserFields>): UserRecord {
  return {
    id: user._id.toString(),
    email: user.email,
    passwordHash: user.passwordHash,
  }
}

export const mongooseUserRepository: UserRepository = {
  async findByEmail(email) {
    const user = await User.findOne({ email }).select('+passwordHash').exec()
    return user ? toUserRecord(user) : null
  },
  async findById(id) {
    const user = await User.findById(id).exec()
    return user ? toUserRecord(user) : null
  },
  async create(input) {
    const user = await User.create(input)
    return toUserRecord(user)
  },
}