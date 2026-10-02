import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/useAuth'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleLogout() {
    setSubmitting(true)
    setError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setError('Unable to sign out. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f8fc] text-[#123553]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e5edf4] bg-white px-5 sm:px-10">
        <div className="flex items-center gap-3 text-lg font-bold">
          <span className="grid size-10 place-items-center rounded-md bg-[#0d2d4b] text-sm text-white">MC</span>
          Mini CRM
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={submitting}
          className="h-10 rounded-md border border-[#dfe9f1] bg-white px-4 text-sm font-semibold text-[#24435f] hover:border-[#514bff] hover:text-[#514bff] disabled:opacity-60"
        >
          {submitting ? 'Signing out...' : 'Sign out'}
        </button>
      </header>
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-10 sm:py-16">
        <p className="text-sm font-semibold text-[#71869a]">ACCOUNT</p>
        <h1 className="mt-3 text-3xl font-bold">You’re signed in</h1>
        <p className="mt-3 text-[#71869a]">Authenticated as {user?.email}</p>
        <p className="mt-10 max-w-xl text-sm leading-6 text-[#71869a]">
          Your Mini CRM account is ready. Customer, deal, and task workflows are not part of this phase.
        </p>
        {error && <p role="alert" className="mt-5 text-sm text-[#d65363]">{error}</p>}
      </section>
    </main>
  )
}
