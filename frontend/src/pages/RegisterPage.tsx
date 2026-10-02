import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/useAuth'
import type { Credentials } from '@/lib/authApi'
import AuthLayout from './AuthLayout'

export default function RegisterPage() {
  const { register, status, user } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-[#f3f8fc] text-sm text-[#71869a]">Checking your session...</main>
  }
  if (user) return <Navigate to="/" replace />

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
      await register(credentials)
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create your account. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Use your email and a password of at least 8 characters."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-semibold">
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="mt-2 h-12 w-full rounded-md border border-[#dfe9f1] bg-[#f3f8fc] px-4 font-normal text-[#123553] outline-none transition focus:border-[#514bff] focus:ring-2 focus:ring-[#514bff]/15"
            placeholder="you@example.com"
          />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            className="mt-2 h-12 w-full rounded-md border border-[#dfe9f1] bg-[#f3f8fc] px-4 font-normal text-[#123553] outline-none transition focus:border-[#514bff] focus:ring-2 focus:ring-[#514bff]/15"
            placeholder="At least 8 characters"
          />
        </label>
        {error && <p role="alert" className="text-sm text-[#d65363]">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="h-12 w-full rounded-md bg-[#514bff] text-sm font-semibold text-white transition hover:bg-[#403be8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514bff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}