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

export type FormFieldErrors = Record<string, string>

export function validateFormFields(
  form: HTMLFormElement,
  labels: Record<string, string>,
): FormFieldErrors {
  const errors: FormFieldErrors = {}

  for (const element of Array.from(form.elements)) {
    if (
      !(element instanceof HTMLInputElement)
      && !(element instanceof HTMLSelectElement)
      && !(element instanceof HTMLTextAreaElement)
    ) continue

    const { name, value, validity, required, type } = element
    if (!name || element.disabled) continue

    const label = labels[name] ?? name
    if ((required && value.trim() === '') || validity.valueMissing) {
      errors[name] = `${label} is required.`
    } else if (validity.typeMismatch && type === 'email') {
      errors[name] = 'Enter a valid email address.'
    } else if (validity.badInput || validity.typeMismatch) {
      errors[name] = `Enter a valid ${label.toLowerCase()}.`
    } else if (validity.rangeUnderflow && element instanceof HTMLInputElement && element.min) {
      errors[name] = `${label} must be at least ${element.min}.`
    } else if (validity.rangeOverflow && element instanceof HTMLInputElement && element.max) {
      errors[name] = `${label} must be no more than ${element.max}.`
    } else if (validity.stepMismatch && type === 'number') {
      errors[name] = `${label} can have no more than two decimal places.`
    } else if (validity.tooLong && 'maxLength' in element && element.maxLength > 0) {
      errors[name] = `${label} must be ${element.maxLength} characters or fewer.`
    } else if (validity.tooShort && 'minLength' in element && element.minLength > 0) {
      errors[name] = `${label} must be at least ${element.minLength} characters.`
    } else if (!validity.valid) {
      errors[name] = `Enter a valid ${label.toLowerCase()}.`
    }
  }

  return errors
}

export function getFormErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 400) return error.message || 'Please check the entered information.'
  if (error.status === 404) return 'This record could not be found. It may have been removed.'
  if (error.status >= 500) return 'Something went wrong. Please try again.'
  return error.message || fallback
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
