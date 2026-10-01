import type { RequestHandler } from 'express'
import { AUTH_COOKIE_NAME, authCookieOptions, verifyAuthToken } from '../utils/authToken'

export const authenticate: RequestHandler = (request, response, next) => {
  const token: unknown = request.cookies?.[AUTH_COOKIE_NAME]
  if (typeof token !== 'string') {
    response.status(401).json({ message: 'Authentication required.' })
    return
  }

  try {
    request.authUser = { id: verifyAuthToken(token) }
    next()
  } catch {
    response.clearCookie(AUTH_COOKIE_NAME, authCookieOptions(false))
    response.status(401).json({ message: 'Authentication required.' })
  }
}