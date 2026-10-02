import { useEffect, useState, type PropsWithChildren } from 'react'
import { ApiError } from '@/lib/apiClient'
import { authApi, type AuthUser, type Credentials } from '@/lib/authApi'
import { AuthContext, type AuthStatus } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    setStatus('loading')

    authApi.getCurrentUser()
      .then(({ user: currentUser }) => {
        if (!active) return
        setUser(currentUser)
        setLoadError(null)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (!active) return
        setUser(null)
        if (error instanceof ApiError && error.status === 401) {
          setLoadError(null)
          setStatus('unauthenticated')
          return
        }
        setLoadError('We could not restore your session. Check your connection and try again.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [retryCount])

  async function login(credentials: Credentials): Promise<void> {
    const { user: authenticatedUser } = await authApi.login(credentials)
    setUser(authenticatedUser)
    setLoadError(null)
    setStatus('authenticated')
  }

  async function register(credentials: Credentials): Promise<void> {
    await authApi.register(credentials)
  }

  async function logout(): Promise<void> {
    await authApi.logout()
    setUser(null)
    setLoadError(null)
    setStatus('unauthenticated')
  }

  function retrySession(): void {
    setRetryCount((count) => count + 1)
  }

  return (
    <AuthContext.Provider value={{ user, status, loadError, login, register, logout, retrySession }}>
      {children}
    </AuthContext.Provider>
  )
}