import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CustomerFormDialog from '@/components/customers/CustomerFormDialog'
import DeleteCustomerDialog from '@/components/customers/DeleteCustomerDialog'
import CustomerShell from '@/components/customers/CustomerShell'
import { customersApi, type CustomerDetailResponse } from '@/lib/customersApi'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const STAGE_STYLES: Record<string, string> = {
  Lead: 'bg-[#efeeff] text-[#514bff]',
  Qualified: 'bg-[#e0f2fe] text-[#0369a1]',
  Proposal: 'bg-[#fef3c7] text-[#b45309]',
  Won: 'bg-[#eaf8f4] text-[#147b66]',
  Lost: 'bg-[#edf2f6] text-[#4e6577]',
}

const PRIORITY_STYLES: Record<string, string> = {
  High: 'bg-[#fff0f0] text-[#c74f60]',
  Medium: 'bg-[#fff6e8] text-[#a76b14]',
  Low: 'bg-[#edf4f8] text-[#60798d]',
}

export default function CustomerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [details, setDetails] = useState<CustomerDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    customersApi.get(id)
      .then((response) => {
        if (active) setDetails(response)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load this customer.')
          setDetails(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [id])

  return (
    <CustomerShell>
    <main className="min-h-screen bg-[#f3f8fc] text-[#123553]">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e5edf4] bg-white px-4 py-3 sm:px-8 lg:px-10">
        <div>
          <Link to="/customers" className="text-xs font-medium text-[#8297a9] hover:text-[#514bff]">Customers</Link>
          <h1 className="mt-0.5 text-xl font-bold">Customer Details</h1>
        </div>
        {details && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-md border border-[#dfe9f1] bg-white px-4 text-sm font-semibold text-[#514bff]">Edit</button>
            <button type="button" onClick={() => setConfirmDelete(true)} className="h-10 rounded-md border border-[#f2cbd0] bg-white px-4 text-sm font-semibold text-[#d65363]">Delete</button>
          </div>
        )}
      </header>

      <section className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-9">
        {notice && <p role="status" className="mb-4 rounded-md bg-[#eaf8f4] px-4 py-3 text-sm text-[#147b66]">{notice}</p>}
        {loading && <p role="status" className="rounded-lg border border-[#e1eaf2] bg-white p-8 text-sm text-[#8297a9]">Loading customer...</p>}
        {error && (
          <section className="rounded-lg border border-[#f2cbd0] bg-white p-8">
            <h2 className="font-semibold">Customer couldn’t be loaded</h2>
            <p role="alert" className="mt-2 text-sm text-[#d65363]">{error}</p>
            <Link to="/customers" className="mt-4 inline-block text-sm font-semibold text-[#514bff]">Back to Customers</Link>
          </section>
        )}
        {!loading && !error && details && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
            <section className="crm-panel p-5 sm:p-8">
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-[#e8eef4] pb-6">
                <div className="flex items-center gap-4">
                  <div aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-[#eaf0f5] text-lg font-semibold text-[#71869a]">
                    {details.customer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{details.customer.name}</h2>
                    <p className="mt-1 text-sm text-[#8297a9]">{details.customer.company}</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#efeeff] px-3 py-1 text-xs font-semibold text-[#514bff]">{details.customer.status}</span>
              </div>

              <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-[#8297a9]">Name</dt><dd className="mt-1 break-words text-sm font-semibold">{details.customer.name}</dd></div>
                <div><dt className="text-xs font-medium text-[#8297a9]">Company</dt><dd className="mt-1 break-words text-sm font-semibold">{details.customer.company}</dd></div>
                <div><dt className="text-xs font-medium text-[#8297a9]">Email</dt><dd className="mt-1 break-all text-sm font-semibold">{details.customer.email}</dd></div>
                <div><dt className="text-xs font-medium text-[#8297a9]">Phone</dt><dd className="mt-1 text-sm font-semibold">{details.customer.phone}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs font-medium text-[#8297a9]">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#24435f]">{details.customer.notes || 'No notes'}</dd></div>
              </dl>
            </section>

            <aside className="space-y-5">
              <section className="crm-panel p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">Recent Deals</h2>
                  <Link to="/deals" className="text-xs font-semibold text-[#514bff] hover:underline">
                    View all
                  </Link>
                </div>
                {details.related.deals.length === 0 ? (
                  <p className="mt-4 text-sm text-[#8297a9]">No related deals yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {details.related.deals.map((deal) => (
                      <article
                        key={deal.id}
                        className="rounded-md border border-[#e8eef4] bg-[#fbfdff] p-3 text-sm transition hover:border-[#514bff]/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="break-words font-semibold text-[#123553]">{deal.title}</h3>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                              STAGE_STYLES[deal.stage] ?? 'bg-[#efeeff] text-[#514bff]'
                            }`}
                          >
                            {deal.stage}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#71869a]">
                          <span className="font-bold text-[#123553]">
                            {currency.format(deal.value)}
                          </span>
                          <span>Close: {formatCalendarDate(deal.expectedCloseDate)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="crm-panel p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">Tasks</h2>
                </div>
                {details.related.tasks.length === 0 ? (
                  <p className="mt-4 text-sm text-[#8297a9]">No related tasks yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {details.related.tasks.map((task) => (
                      <article
                        key={task.id}
                        className={`rounded-md border p-3 text-sm transition ${
                          task.overdue && !task.completed
                            ? 'border-[#f2cbd0] bg-[#fff8f9]'
                            : 'border-[#e8eef4] bg-[#fbfdff]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={`break-words font-semibold ${
                              task.completed ? 'text-[#8297a9] line-through' : 'text-[#123553]'
                            }`}
                          >
                            {task.title}
                          </h3>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                              PRIORITY_STYLES[task.priority] ?? 'bg-[#edf4f8] text-[#60798d]'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span
                            className={
                              task.overdue && !task.completed
                                ? 'font-semibold text-[#c74f60]'
                                : 'text-[#71869a]'
                            }
                          >
                            Due {formatCalendarDate(task.dueDate)}
                          </span>
                          {task.completed ? (
                            <span className="font-semibold text-[#147b66]">Done</span>
                          ) : task.overdue ? (
                            <span className="font-semibold text-[#c74f60]">Overdue</span>
                          ) : (
                            <span className="text-[#8297a9]">Pending</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </section>

      {editing && details && (
        <CustomerFormDialog customer={details.customer} onClose={() => setEditing(false)} onSaved={(customer) => {
          setDetails((current) => current ? { ...current, customer } : current)
          setEditing(false)
          setNotice(`${customer.name} updated.`)
        }} />
      )}
      {confirmDelete && details && (
        <DeleteCustomerDialog customerId={details.customer.id} customerName={details.customer.name}
          onClose={() => setConfirmDelete(false)}
          onDeleted={() => navigate('/customers', { replace: true, state: { notice: 'Customer deleted.' } })} />
      )}
    </main>
    </CustomerShell>
  )
}