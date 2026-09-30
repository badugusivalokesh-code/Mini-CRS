import { NextFunction, Request, Response } from 'express'

export interface HttpError extends Error {
  status?: number
}

/**
 * Central error handler. Later phases (request validation, the CORS
 * allowlist, auth) throw HttpError-shaped errors with a `status`; anything
 * unexpected falls back to 500 without ever leaking internals to the client.
 *
 * Express only treats a middleware as an error handler if it takes all four
 * arguments, so `_next` is required even though it's unused.
 */
export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err.status ?? 500

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err)
  }

  res.status(status).json({
    message: status >= 500 ? 'Internal server error' : err.message,
  })
}
