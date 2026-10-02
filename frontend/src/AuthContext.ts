import { createContext } from 'react'
import type { AuthUser, Credentials } from '@/lib/authApi'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthContextValue {
  user: AuthUser | null
  status: AuthStatus
  loadError: string | null
  login: (credentials: Credentials) => Promise<void>
  register: (credentials: Credentials) => Promise<void>
  logout: () => Promise<void>
  retrySession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)