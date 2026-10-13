import type { RequestHandler } from 'express'
import { AUTH_COOKIE_NAME, authCookieOptions, verifyAuthToken } from '../utils/authToken'

export const authenticate: RequestHandler = (request, response, next) => {
  let token: string | undefined

  if (typeof request.cookies?.[AUTH_COOKIE_NAME] === 'string') {
    token = request.cookies[AUTH_COOKIE_NAME]
  } else if (
    typeof request.headers.authorization === 'string'
    && request.headers.authorization.startsWith('Bearer ')
  ) {
    token = request.headers.authorization.slice(7).trim()
  }

  if (!token) {
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