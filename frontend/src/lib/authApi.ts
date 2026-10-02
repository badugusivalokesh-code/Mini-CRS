import { apiRequest } from './apiClient'

export interface AuthUser {
  id: string
  email: string
}

export interface Credentials {
  email: string
  password: string
}

interface AuthResponse {
  user: AuthUser
}

export const authApi = {
  getCurrentUser: () => apiRequest<AuthResponse>('/api/auth/me'),
  login: (credentials: Credentials) =>
    apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: credentials }),
  register: (credentials: Credentials) =>
    apiRequest<AuthResponse>('/api/auth/register', { method: 'POST', body: credentials }),
  logout: () => apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }),
}