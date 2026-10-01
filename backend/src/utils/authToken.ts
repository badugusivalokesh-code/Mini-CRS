import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export const AUTH_COOKIE_NAME = 'mini_crm_auth'
export const AUTH_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60

export function createAuthToken(userId: string): string {
  return jwt.sign({}, env.jwtSecret, {
    subject: userId,
    expiresIn: AUTH_TOKEN_LIFETIME_SECONDS,
  })
}

export function verifyAuthToken(token: string): string {
  const payload = jwt.verify(token, env.jwtSecret)
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid authentication token')
  }
  return payload.sub
}

export function authCookieOptions(includeMaxAge = true) {
  const isProduction = env.nodeEnv === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    path: '/',
    ...(includeMaxAge ? { maxAge: AUTH_TOKEN_LIFETIME_SECONDS * 1000 } : {}),
  }
}