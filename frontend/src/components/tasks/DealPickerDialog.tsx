import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { getFormErrorMessage } from '@/lib/apiClient'
import { dealsApi, type Deal } from '@/lib/dealsApi'

interface DealPickerDialogProps {
  onClose: () => void
  onSelect: (deal: Deal) => void
}

export default function DealPickerDialog({ onClose, onSelect }: DealPickerDialogProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    dealsApi.list()
      .then(({ deals: records }) => {
        if (active) setDeals(records)
      })
      .catch((requestError: unknown) => {
        if (active) setError(getFormErrorMessage(requestError, 'Unable to load deals.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [retryCount])

  return (
    <div className="crm-modal-backdrop fixed inset-0 z-[60] flex items-start justify-center bg-[#123553]/40 p-3 sm:items-center sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="task-deal-picker-title"
        className="crm-dialog flex max-h-[min(680px,calc(100dvh-1.5rem))] w-full max-w-[440px] flex-col rounded-xl border border-[#e1eaf2] bg-white p-4 shadow-xl sm:max-h-[min(680px,calc(100vh-2rem))] sm:p-6">
        <header className="flex items-center justify-between gap-3">
          <h2 id="task-deal-picker-title" className="text-lg font-bold text-[#123553]">Link a Deal</h2>
          <button type="button" onClick={onClose} aria-label="Close deal selection" className="rounded-md px-2 py-1 text-lg text-[#8297a9] hover:bg-[#f3f8fc]">×</button>
        </header>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {loading && <p role="status" className="py-8 text-center text-sm text-[#8297a9]">Loading deals...</p>}
          {!loading && error && <p role="alert" className="py-8 text-center text-sm text-[#d65363]">{error}</p>}
          {!loading && !error && deals.length === 0 && <p className="py-8 text-center text-sm text-[#8297a9]">No deals available.</p>}
          {!loading && !error && deals.map((deal) => (
            <button key={deal.id} type="button" onClick={() => onSelect(deal)}
              className="flex w-full items-center gap-3 rounded-lg border-b border-[#edf2f6] px-2 py-3 text-left last:border-0 hover:bg-[#f7faff]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#123553]">{deal.title}</span>
                <span className="block truncate text-xs text-[#8297a9]">{deal.stage} · {deal.customer?.name ?? 'No customer linked'}</span>
              </span>
              <ArrowRight size={17} className="shrink-0 text-[#514bff]" />
            </button>
          ))}
        </div>
        {error && !loading && (
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-3 text-sm font-semibold text-[#514bff]">Retry</button>
        )}
      </section>
    </div>
  )
}
