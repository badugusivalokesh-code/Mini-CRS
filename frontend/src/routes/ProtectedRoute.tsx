import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/useAuth'

export default function ProtectedRoute() {
  const { user, status, loadError, retrySession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f8fc] px-4 text-[#24435f]">
        <p role="status" className="text-sm">Checking your session...</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f8fc] px-4 text-[#123553]">
        <section className="w-full max-w-md rounded-xl border border-[#e3edf5] bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">Session unavailable</h1>
          <p role="alert" className="mt-3 text-sm text-[#71869a]">{loadError}</p>
          <button
            type="button"
            onClick={retrySession}
            className="mt-6 h-11 rounded-md bg-[#514bff] px-6 text-sm font-semibold text-white hover:bg-[#403be8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514bff]"
          >
            Retry
          </button>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}