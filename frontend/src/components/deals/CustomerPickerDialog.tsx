import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'
import { getFormErrorMessage } from '@/lib/apiClient'
import { customersApi, type Customer } from '@/lib/customersApi'

interface CustomerPickerDialogProps {
  onClose: () => void
  onSelect: (customer: Customer) => void
}

export default function CustomerPickerDialog({ onClose, onSelect }: CustomerPickerDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    const query = new URLSearchParams({ page: String(page), limit: '10' })
    if (search) query.set('search', search)
    if (page === 1) setLoading(true)
    else setLoadingMore(true)
    setError('')

    customersApi.list(query)
      .then((result) => {
        if (!active) return
        setCustomers((current) => page === 1 ? result.customers : [...current, ...result.customers])
        setTotalPages(result.pagination.totalPages)
      })
      .catch((requestError: unknown) => {
        if (active) setError(getFormErrorMessage(requestError, 'Unable to load customers.'))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
        setLoadingMore(false)
      })

    return () => { active = false }
  }, [page, search, retryCount])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchDraft.trim())
  }

  return (
    <div className="crm-modal-backdrop fixed inset-0 z-[60] flex items-start justify-center bg-[#123553]/40 p-3 sm:items-center sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="customer-picker-title"
        className="crm-dialog flex max-h-[min(680px,calc(100dvh-1.5rem))] w-full max-w-[440px] flex-col rounded-xl border border-[#e1eaf2] bg-white p-4 shadow-xl sm:max-h-[min(680px,calc(100vh-2rem))] sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <h2 id="customer-picker-title" className="text-lg font-bold text-[#123553]">Select Customer</h2>
          <button type="button" onClick={onClose} aria-label="Close customer selection" className="rounded-md px-2 py-1 text-lg text-[#8297a9] hover:bg-[#f3f8fc]">×</button>
        </header>
        <form onSubmit={applySearch} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor="deal-customer-search">Search customers</label>
          <input id="deal-customer-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={160} placeholder="Search customers" className="crm-input mt-0 h-10 min-w-0 flex-1 px-3" />
          <button type="submit" className="h-10 rounded-md bg-[#514bff] px-4 text-sm font-semibold text-white">Search</button>
        </form>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {loading && <p role="status" className="py-8 text-center text-sm text-[#8297a9]">Loading customers...</p>}
          {!loading && error && <p role="alert" className="py-8 text-center text-sm text-[#d65363]">{error}</p>}
          {!loading && !error && customers.length === 0 && <p className="py-8 text-center text-sm text-[#8297a9]">No customers found.</p>}
          {!loading && !error && customers.map((customer) => (
            <button key={customer.id} type="button" onClick={() => onSelect(customer)}
              className="flex w-full items-center gap-3 rounded-lg border-b border-[#edf2f6] px-2 py-3 text-left last:border-0 hover:bg-[#f7faff]">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eaf0f5] text-xs font-semibold text-[#71869a]">
                {customer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#123553]">{customer.name}</span>
                <span className="block truncate text-xs text-[#8297a9]">{customer.company} · {customer.email}</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-[#514bff]" />
            </button>
          ))}
        </div>
        {error && !loading && (
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-3 text-sm font-semibold text-[#514bff]">Retry</button>
        )}
        {!loading && !error && page < totalPages && (
          <button type="button" disabled={loadingMore} onClick={() => setPage((current) => current + 1)}
            className="mt-3 h-10 self-center rounded-full px-4 text-sm font-semibold text-[#514bff] hover:bg-[#efeeff] disabled:opacity-60">
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </section>
    </div>
  )
}