import express, { Application } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env'
import healthRouter from './routes/health.routes'
import { createAuthRouter } from './routes/auth.routes'
import { mongooseUserRepository, type UserRepository } from './models/User'
import { notFound } from './middleware/notFound'
import { errorHandler, HttpError } from './middleware/errorHandler'

export interface AppOptions {
  userRepository?: UserRepository
}

export function createApp(options: AppOptions = {}): Application {
  const app = express()

  app.use(helmet())

  // CORS allowlist: only CLIENT_URL is trusted. A disallowed origin is
  // rejected with a 403 (handled by errorHandler below), never a raw 500.
  const allowedOrigins = [env.clientUrl]

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header (e.g. curl, server-to-server health checks) is allowed through.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        const error: HttpError = new Error('Not allowed by CORS')
        error.status = 403
        callback(error)
      },
      credentials: true,
    }),
  )

  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/auth', createAuthRouter(options.userRepository ?? mongooseUserRepository))
  app.use('/api', healthRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
