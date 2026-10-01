import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AuthService } from '../services/authService'
import { authenticate } from '../middleware/authenticate'
import { mongooseUserRepository, type UserRepository } from '../models/User'
import { authCookieOptions, AUTH_COOKIE_NAME } from '../utils/authToken'
import { asyncRoute } from '../utils/asyncRoute'
import { loginSchema, registerSchema } from '../validation/authSchemas'

const rateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
}

export function createAuthRouter(users: UserRepository = mongooseUserRepository): Router {
  const router = Router()
  const auth = new AuthService(users)
  const registerLimiter = rateLimit(rateLimitOptions)
  const loginLimiter = rateLimit(rateLimitOptions)

  router.post('/register', registerLimiter, asyncRoute(async (request, response) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }

    const user = await auth.register(parsed.data)
    response.status(201).json({ user })
  }))

  router.post('/login', loginLimiter, asyncRoute(async (request, response) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid request body.' })
      return
    }

    const { user, token } = await auth.login(parsed.data)
    response.cookie(AUTH_COOKIE_NAME, token, authCookieOptions())
    response.status(200).json({ user })
  }))

  router.post('/logout', (_request, response) => {
    response.clearCookie(AUTH_COOKIE_NAME, authCookieOptions(false))
    response.status(200).json({ message: 'Logged out.' })
  })

  router.get('/me', authenticate, asyncRoute(async (request, response) => {
    const userId = request.authUser?.id
    if (!userId) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }

    const user = await auth.getUser(userId)
    if (!user) {
      response.clearCookie(AUTH_COOKIE_NAME, authCookieOptions(false))
      response.status(401).json({ message: 'Authentication required.' })
      return
    }

    response.status(200).json({ user })
  }))

  return router
}