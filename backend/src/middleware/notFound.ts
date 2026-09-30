import { Request, Response } from 'express'

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}
