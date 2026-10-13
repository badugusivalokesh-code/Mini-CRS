import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/useAuth'
import type { Credentials } from '@/lib/authApi'
import { copyText } from '@/lib/clipboard'
import AuthLayout from './AuthLayout'

const DEMO_EMAIL = 'demo@clientra.app'
const DEMO_PASSWORD = 'Clientra@123'

interface LoginLocationState {
  from?: { pathname?: string }
  registered?: boolean
}

type DemoCredentialField = 'email' | 'password'

function DemoCredentials() {
  const [copyResult, setCopyResult] = useState<Record<DemoCredentialField, 'success' | 'error' | null>>({
    email: null,
    password: null,
  })

  async function handleCopy(field: DemoCredentialField, value: string) {
    const copied = await copyText(value)

    setCopyResult((current) => ({ ...current, [field]: copied ? 'success' : 'error' }))
    window.setTimeout(() => {
      setCopyResult((current) => ({ ...current, [field]: null }))
    }, 3000)
  }

  return (
    <section
      aria-labelledby="demo-account-title"
      className="mb-6 rounded-lg border border-[#e0eaf4] bg-[#f7fbff] p-4"
    >
      <div className="mb-3">
        <h2 id="demo-account-title" className="text-sm font-bold text-[#123553]">Demo Credentials</h2>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-[#8297a9]">Email</span>
          <span className="min-w-0 flex-1 font-mono text-sm font-semibold text-[#123553] break-all">{DEMO_EMAIL}</span>
          <button
            type="button"
            onClick={() => { void handleCopy('email', DEMO_EMAIL) }}
            className="inline-flex items-center rounded border border-[#d5d3ff] bg-white px-2.5 py-1 text-xs font-semibold text-[#514bff] transition hover:bg-[#f0f0ff]"
          >
            Copy Email
          </button>
        </div>
        {copyResult.email && (
          <p role={copyResult.email === 'error' ? 'alert' : 'status'} className="ml-16 text-xs text-[#71869a]">
            {copyResult.email === 'success'
              ? 'Email copied.'
              : 'Unable to copy email. Select it above and copy it manually.'}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-[#8297a9]">Password</span>
          <span className="min-w-0 flex-1 font-mono text-sm font-semibold text-[#123553]">{DEMO_PASSWORD}</span>
          <button
            type="button"
            onClick={() => { void handleCopy('password', DEMO_PASSWORD) }}
            className="inline-flex items-center rounded border border-[#d5d3ff] bg-white px-2.5 py-1 text-xs font-semibold text-[#514bff] transition hover:bg-[#f0f0ff]"
          >
            Copy Password
          </button>
        </div>
        {copyResult.password && (
          <p role={copyResult.password === 'error' ? 'alert' : 'status'} className="ml-16 text-xs text-[#71869a]">
            {copyResult.password === 'success'
              ? 'Password copied.'
              : 'Unable to copy password. Select it above and copy it manually.'}
          </p>
        )}
      </div>
    </section>
  )
}

export default function LoginPage() {
  const { login, status, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState | null
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-[#f3f8fc] text-sm text-[#71869a]">Checking your session...</main>
  }
  if (user) return <Navigate to={locationState?.from?.pathname ?? '/'} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    const credentials: Credentials = {
      email: String(formData.get('email')),
      password: String(formData.get('password')),
    }

    try {
      await login(credentials)
      navigate(locationState?.from?.pathname ?? '/', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue to your Clientra account."
      footerText="New to Clientra?"
      footerLinkText="Create an account"
      footerTo="/register"
    >
      {locationState?.registered && (
        <p role="status" className="mb-5 rounded-md bg-[#eaf8f4] px-3 py-2.5 text-sm text-[#147b66]">
          Account created. Sign in with your new credentials.
        </p>
      )}
      <DemoCredentials />
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-semibold">
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="crm-input h-12 px-4"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
            className="crm-input h-12 px-4"
            placeholder="Enter your password"
          />
        </label>
        {error && <p role="alert" className="text-sm text-[#d65363]">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-md bg-[#514bff] text-sm font-semibold text-white transition hover:bg-[#403be8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514bff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
