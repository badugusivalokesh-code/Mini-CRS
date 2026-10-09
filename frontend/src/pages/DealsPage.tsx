import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CustomerShell from '@/components/customers/CustomerShell'
import DeleteDealDialog from '@/components/deals/DeleteDealDialog'
import DealFormDialog from '@/components/deals/DealFormDialog'
import { DEAL_STAGES, dealsApi, type Deal, type DealStage } from '@/lib/dealsApi'

type DealDialogState = { mode: 'create' } | { mode: 'edit'; deal: Deal } | null

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function formatCloseDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [dialog, setDialog] = useState<DealDialogState>(null)
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    dealsApi.list()
      .then((response) => {
        if (active) setDeals(response.deals)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load deals.')
          setDeals([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [refresh])

  async function changeStage(deal: Deal, stage: DealStage) {
    if (stage === deal.stage) return
    setUpdatingId(deal.id)
    setError('')
    try {
      const result = await dealsApi.update(deal.id, { stage })
      setDeals((current) => current.map((item) => item.id === deal.id ? result.deal : item))
      setNotice(`${deal.title} moved to ${stage}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update deal stage.')
    } finally {
      setUpdatingId(null)
    }
  }

  function handleSaved(deal: Deal) {
    const wasEditing = dialog?.mode === 'edit'
    setDeals((current) => wasEditing
      ? current.map((item) => item.id === deal.id ? deal : item)
      : [deal, ...current])
    setNotice(`${deal.title} ${wasEditing ? 'updated' : 'created'}.`)
    setDialog(null)
  }

  function handleDeleted() {
    setDeals((current) => current.filter((deal) => deal.id !== deleteDeal?.id))
    setNotice('Deal deleted.')
    setDeleteDeal(null)
  }

  return (
    <CustomerShell>
      <main className="min-h-screen bg-[#f3f8fc] text-[#123553]">
        <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e5edf4] bg-white px-4 py-3 sm:px-8 lg:px-10">
          <div>
            <Link to="/" className="text-xs font-medium text-[#8297a9] hover:text-[#514bff]">Mini CRM</Link>
            <h1 className="mt-0.5 text-xl font-bold">Deals</h1>
          </div>
          <button type="button" onClick={() => setDialog({ mode: 'create' })}
            className="h-10 whitespace-nowrap rounded-lg bg-[#514bff] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#403be8] hover:shadow sm:px-5">
            Add Deal <span aria-hidden="true" className="ml-1">+</span>
          </button>
        </header>

        <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-9">
          {notice && <p role="status" className="mb-4 rounded-md bg-[#eaf8f4] px-4 py-3 text-sm text-[#147b66]">{notice}</p>}
          {error && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#f2cbd0] bg-white px-4 py-3">
              <p role="alert" className="text-sm text-[#d65363]">{error}</p>
              {loading && <span role="status" className="text-sm text-[#8297a9]">Loading deals...</span>}
              {!loading && deals.length === 0 && <button type="button" onClick={() => setRefresh((count) => count + 1)} className="text-sm font-semibold text-[#514bff]">Try again</button>}
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold">Total: {loading ? '...' : deals.length} deals</p>
            <p className="text-xs text-[#8297a9]">Pipeline grouped by stage</p>
          </div>

          {loading && deals.length === 0 && (
            <p role="status" className="rounded-lg border border-[#e1eaf2] bg-white px-5 py-12 text-center text-sm text-[#8297a9]">Loading deals...</p>
          )}
          {!loading && !error && deals.length === 0 && (
            <p role="status" className="mb-4 rounded-lg border border-dashed border-[#cad9e6] bg-white px-5 py-6 text-center text-sm text-[#71869a]">
              Your pipeline is empty. Add a deal to get started.
            </p>
          )}
          {!loading && (!error || deals.length > 0) && (
            <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
              <div className="flex min-h-[420px] w-max items-start gap-4">
                {DEAL_STAGES.map((stage) => {
                  const stageDeals = deals.filter((deal) => deal.stage === stage)
                  const stageValue = stageDeals.reduce((total, deal) => total + deal.value, 0)
                  return (
                    <section key={stage} aria-label={`${stage} deals`} className="flex min-h-[400px] w-[276px] flex-col rounded-xl border border-[#e1eaf2] bg-[#edf3f8] p-3">
                      <header className="mb-3 flex items-center justify-between gap-2 px-1 py-1">
                        <h2 className="text-sm font-bold text-[#24435f]">{stage}</h2>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#71869a]">{stageDeals.length}</span>
                      </header>
                      <p className="mb-3 px-1 text-xs text-[#8297a9]">{currency.format(stageValue)} total</p>
                      <div className="flex flex-1 flex-col gap-3">
                        {stageDeals.map((deal) => (
                          <article key={deal.id} className="crm-card rounded-lg border border-[#e1eaf2] bg-white p-4 shadow-[0_2px_8px_rgba(18,53,83,0.035)]">
                            <h3 className="break-words text-sm font-bold leading-5 text-[#123553]">{deal.title}</h3>
                            <p className="mt-3 text-lg font-semibold text-[#123553]">{currency.format(deal.value)}</p>
                            <div className="mt-3 border-t border-[#edf2f6] pt-3">
                              <p className="truncate text-sm font-semibold text-[#24435f]">{deal.customer?.name ?? 'Customer unavailable'}</p>
                              {deal.customer && <p className="mt-0.5 truncate text-xs text-[#8297a9]">{deal.customer.company}</p>}
                              <p className="mt-2 text-xs text-[#8297a9]">Expected close</p>
                              <p className="text-xs font-medium text-[#516b80]">{formatCloseDate(deal.expectedCloseDate)}</p>
                            </div>
                            <label className="mt-3 block text-xs font-semibold text-[#71869a]">
                              Stage
                              <select value={deal.stage} disabled={updatingId === deal.id}
                                onChange={(event) => { void changeStage(deal, event.target.value as DealStage) }}
                                className="mt-1 h-9 w-full rounded-md border border-[#e1eaf2] bg-[#f7faff] px-2 text-xs text-[#24435f] disabled:opacity-60">
                                {DEAL_STAGES.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                            </label>
                            <div className="mt-3 flex justify-end gap-4 text-xs font-semibold">
                              <button type="button" onClick={() => setDialog({ mode: 'edit', deal })} className="text-[#514bff] hover:underline">Edit</button>
                              <button type="button" onClick={() => setDeleteDeal(deal)} className="text-[#d65363] hover:underline">Delete</button>
                            </div>
                          </article>
                        ))}
                        {stageDeals.length === 0 && <p className="rounded-md border border-dashed border-[#cad9e6] px-3 py-5 text-center text-xs text-[#8297a9]">No deals in this stage</p>}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </main>
      {dialog && (
        <DealFormDialog deal={dialog.mode === 'edit' ? dialog.deal : undefined}
          onClose={() => setDialog(null)} onSaved={handleSaved} />
      )}
      {deleteDeal && <DeleteDealDialog deal={deleteDeal} onClose={() => setDeleteDeal(null)} onDeleted={handleDeleted} />}
    </CustomerShell>
  )
}