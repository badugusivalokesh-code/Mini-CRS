import bcrypt from 'bcryptjs'
import type { UserRecord, UserRepository } from '../models/User'
import type { LoginInput, RegisterInput } from '../validation/authSchemas'
import { createAuthToken } from '../utils/authToken'

export interface SafeUser {
  id: string
  email: string
}

export class AuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'AuthError'
  }
}

function toSafeUser(user: UserRecord): SafeUser {
  return { id: user.id, email: user.email }
}

function isDuplicateEmailError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async register(input: RegisterInput): Promise<SafeUser> {
    if (await this.users.findByEmail(input.email)) {
      throw new AuthError('An account with this email already exists.', 409)
    }

    const passwordHash = await bcrypt.hash(input.password, 12)
    try {
      const user = await this.users.create({ email: input.email, passwordHash })
      return toSafeUser(user)
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        throw new AuthError('An account with this email already exists.', 409)
      }
      throw error
    }
  }

  async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await this.users.findByEmail(input.email)
    const passwordMatches = user?.passwordHash
      ? await bcrypt.compare(input.password, user.passwordHash)
      : false

    if (!user || !passwordMatches) {
      throw new AuthError('Email or password is incorrect.', 401)
    }

    return { user: toSafeUser(user), token: createAuthToken(user.id) }
  }

  async getUser(id: string): Promise<SafeUser | null> {
    const user = await this.users.findById(id)
    return user ? toSafeUser(user) : null
  }
}