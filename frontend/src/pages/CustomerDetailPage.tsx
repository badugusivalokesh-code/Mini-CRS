import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CustomerFormDialog from '@/components/customers/CustomerFormDialog'
import DeleteCustomerDialog from '@/components/customers/DeleteCustomerDialog'
import CustomerShell from '@/components/customers/CustomerShell'
import { customersApi, type CustomerDetailResponse } from '@/lib/customersApi'

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
      <header className="flex min-h-[76px] items-center justify-between border-b border-[#e5edf4] bg-white px-5 sm:px-10">
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
            <section className="rounded-lg border border-[#e1eaf2] bg-white p-5 sm:p-8">
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
              <section className="rounded-lg border border-[#e1eaf2] bg-white p-5 sm:p-6">
                <h2 className="font-bold">Recent Deals</h2>
                {details.related.deals.length === 0 && <p className="mt-4 text-sm text-[#8297a9]">No related deals yet.</p>}
              </section>
              <section className="rounded-lg border border-[#e1eaf2] bg-white p-5 sm:p-6">
                <h2 className="font-bold">Tasks</h2>
                {details.related.tasks.length === 0 && <p className="mt-4 text-sm text-[#8297a9]">No related tasks yet.</p>}
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