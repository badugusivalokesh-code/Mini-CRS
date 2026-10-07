const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  // Fail loudly during development rather than silently calling the wrong host.
  console.error('VITE_API_URL is not set. Check your frontend .env file.')
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Thin fetch wrapper for talking to the Mini CRM backend.
 *
 * - Sends and parses JSON automatically.
 * - Always sends credentials so browser requests include the httpOnly auth cookie.
 * - Converts non-2xx responses into ApiError for auth forms and route guards.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    const message = (data && typeof data === 'object' && 'message' in data
      ? String((data as { message: unknown }).message)
      : undefined) ?? response.statusText
    throw new ApiError(response.status, message)
  }

  return data as T
}
