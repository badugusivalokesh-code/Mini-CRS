import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CustomerShell from '@/components/customers/CustomerShell'
import DashboardLoadingState from '@/components/dashboard/DashboardLoadingState'
import DashboardMetrics from '@/components/dashboard/DashboardMetrics'
import PipelineValueChart from '@/components/dashboard/PipelineValueChart'
import { useAuth } from '@/useAuth'
import { dashboardApi, type DashboardData } from '@/lib/dashboardApi'

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  async function handleLogout() {
    setSigningOut(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    dashboardApi.get()
      .then((response) => {
        if (active) setData(response.dashboard)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard data.')
          setData(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadAttempt])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const accountName = user?.email?.split('@')[0] ?? 'there'
  const displayName = accountName.charAt(0).toUpperCase() + accountName.slice(1)

  return (
    <CustomerShell>
      <main className="min-h-screen bg-[#f3f8fc] text-[#123553]">
        <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e5edf4] bg-white px-4 py-3 sm:px-8 lg:px-10">
          <div>
            <h1 className="mt-0.5 text-xl font-bold text-[#123553]">{greeting}, {displayName}</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="h-10 rounded-md border border-[#dfe9f1] bg-white px-4 text-sm font-semibold text-[#24435f] hover:border-[#514bff] hover:text-[#514bff] disabled:opacity-60"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </header>

        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">
          {logoutError && <p role="alert" className="mb-4 text-sm text-[#d65363]">{logoutError}</p>}
          {error && (
            <section role="alert" className="mb-6 rounded-lg border border-[#f2cbd0] bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 shrink-0 text-[#d65363]" />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-[#d65363]">Error loading dashboard</h2>
                  <p className="mt-1 text-sm text-[#71869a]">{error}</p>
                  <button
                    type="button"
                    onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                    className="mt-3 inline-flex items-center text-xs font-semibold text-[#514bff] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </section>
          )}

          {loading && !data && <DashboardLoadingState />}
          {data && (
            <div className="space-y-6">
              <DashboardMetrics data={data} />
              <PipelineValueChart data={data} />
            </div>
          )}
        </div>
      </main>
    </CustomerShell>
  )
}
