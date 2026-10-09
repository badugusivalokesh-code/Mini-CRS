import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import CustomerFormDialog from '@/components/customers/CustomerFormDialog'
import DeleteCustomerDialog from '@/components/customers/DeleteCustomerDialog'
import CustomerShell from '@/components/customers/CustomerShell'
import { customersApi, type Customer, type CustomerListResponse } from '@/lib/customersApi'

type FormDialogState = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null

export default function CustomersPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [result, setResult] = useState<CustomerListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => {
    const state = location.state as { notice?: string } | null
    return state?.notice ?? ''
  })
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') ?? '')
  const [statusDraft, setStatusDraft] = useState(searchParams.get('status') ?? '')
  const [showFilters, setShowFilters] = useState(false)
  const [formDialog, setFormDialog] = useState<FormDialogState>(null)
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)
  const [refresh, setRefresh] = useState(0)

  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const requestedLimit = Number.parseInt(searchParams.get('limit') ?? '10', 10)
  const limit = [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10

  useEffect(() => {
    setSearchDraft(search)
    setStatusDraft(status)
  }, [search, status])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams()
    if (search) query.set('search', search)
    if (status) query.set('status', status)
    query.set('page', String(page))
    query.set('limit', String(limit))
    setLoading(true)
    setError('')

    customersApi.list(query)
      .then((data) => {
        if (active) setResult(data)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load customers.')
          setResult(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [search, status, page, limit, refresh])

  function updateQuery(updates: Record<string, string | null>, resetPage = false) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.delete('page')
    setSearchParams(next)
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateQuery({ search: searchDraft.trim() || null, status: statusDraft.trim() || null }, true)
    setShowFilters(false)
  }

  function handleSaved(customer: Customer) {
    setFormDialog(null)
    setNotice(`${customer.name} ${formDialog?.mode === 'edit' ? 'updated' : 'created'}.`)
    setRefresh((count) => count + 1)
  }

  function handleDeleted() {
    setDeleteCustomer(null)
    setNotice('Customer deleted.')
    if (result?.customers.length === 1 && page > 1) updateQuery({ page: String(page - 1) })
    else setRefresh((count) => count + 1)
  }

  const customers = result?.customers ?? []
  const pagination = result?.pagination
  const totalPages = Math.max(pagination?.totalPages ?? 0, 1)
  const hasFilters = Boolean(search || status)

  return (
    <CustomerShell>
    <main className="min-h-screen bg-[#f3f8fc] text-[#123553]">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e5edf4] bg-white px-4 py-3 sm:px-8 lg:px-10">
        <div>
          <Link to="/" className="text-xs font-medium text-[#8297a9] hover:text-[#514bff]">Mini CRM</Link>
          <h1 className="mt-0.5 text-xl font-bold">Customers</h1>
        </div>
        <button type="button" onClick={() => setFormDialog({ mode: 'create' })}
          className="h-10 whitespace-nowrap rounded-lg bg-[#514bff] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#403be8] hover:shadow sm:px-5">
          Add Customer <span aria-hidden="true" className="ml-1">+</span>
        </button>
      </header>

      <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-9">
        {notice && <p role="status" className="crm-status mb-4 rounded-lg bg-[#eaf8f4] px-4 py-3 text-sm text-[#147b66]">{notice}</p>}
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold">Total: {pagination?.total ?? (loading ? '...' : 0)} customers</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form onSubmit={applyFilters} className="flex min-w-0 flex-1 gap-2 sm:w-[350px]">
              <label className="sr-only" htmlFor="customer-search">Search customers</label>
              <input id="customer-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search name, company, email" maxLength={160}
                className="crm-input mt-0 h-10 min-w-0 flex-1 rounded-lg px-3" />
              <button type="submit" className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-[#514bff] hover:bg-[#f0efff]">Search</button>
            </form>
            <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters((visible) => !visible)}
              className="h-10 rounded-full border border-[#e1eaf2] bg-white px-5 text-sm font-semibold text-[#24435f] hover:border-[#514bff]">
              {showFilters ? 'Hide Filter' : 'Filter'}{status ? ' (1)' : ''}
            </button>
          </div>
        </div>

        {showFilters && (
          <form onSubmit={applyFilters} className="mb-5 flex flex-col gap-3 rounded-lg border border-[#e1eaf2] bg-white p-4 sm:flex-row sm:items-end">
            <label className="w-full max-w-sm text-sm font-semibold text-[#24435f]">
              Status
              <input value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} maxLength={40}
                placeholder="Enter a status" className="crm-input" />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="h-10 rounded-md bg-[#514bff] px-4 text-sm font-semibold text-white">Apply</button>
              <button type="button" onClick={() => { setStatusDraft(''); updateQuery({ status: null }, true) }}
                className="h-10 rounded-md border border-[#dfe9f1] px-4 text-sm font-semibold text-[#516b80]">Clear status</button>
            </div>
          </form>
        )}

        {error && (
          <section className="rounded-lg border border-[#f2cbd0] bg-white p-8 text-center">
            <h2 className="font-semibold">Customers couldn’t be loaded</h2>
            <p role="alert" className="mt-2 text-sm text-[#d65363]">{error}</p>
            <button type="button" onClick={() => setRefresh((count) => count + 1)} className="mt-4 text-sm font-semibold text-[#514bff]">Try again</button>
          </section>
        )}

        {!error && loading && (
          <div role="status" className="rounded-lg border border-[#e1eaf2] bg-white px-5 py-12 text-center text-sm text-[#8297a9]">Loading customers...</div>
        )}

        {!error && !loading && customers.length === 0 && (
          <section className="rounded-lg border border-[#e1eaf2] bg-white px-5 py-14 text-center">
            <h2 className="font-semibold">{hasFilters ? 'No customers match these filters' : 'No customers yet'}</h2>
            <p className="mt-2 text-sm text-[#8297a9]">{hasFilters ? 'Try changing your search or status.' : 'Add a customer to get started.'}</p>
            {hasFilters ? (
              <button type="button" onClick={() => { setSearchDraft(''); setStatusDraft(''); updateQuery({ search: null, status: null, page: null }) }}
                className="mt-5 text-sm font-semibold text-[#514bff]">Clear filters</button>
            ) : (
              <button type="button" onClick={() => setFormDialog({ mode: 'create' })}
                className="mt-5 h-10 rounded-md bg-[#514bff] px-4 text-sm font-semibold text-white">Add Customer</button>
            )}
          </section>
        )}

        {!error && !loading && customers.length > 0 && (
          <>
            <div className="crm-panel overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-[#f8fafc] text-[#71869a]">
                  <tr className="border-b border-[#e8eef4]">
                    <th scope="col" className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Name</th>
                    <th scope="col" className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide">Email</th>
                    <th scope="col" className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide">Phone</th>
                    <th scope="col" className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide">Company</th>
                    <th scope="col" className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide">Status</th>
                    <th scope="col" className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-[#e8eef4] last:border-0 hover:bg-[#fbfdff]">
                      <td className="px-5 py-4">
                        <Link to={`/customers/${customer.id}`} className="font-semibold text-[#123553] hover:text-[#514bff]">{customer.name}</Link>
                      </td>
                      <td className="px-4 py-4 text-[#24435f]">{customer.email}</td>
                      <td className="px-4 py-4 text-[#24435f]">{customer.phone}</td>
                      <td className="px-4 py-4 text-[#71869a]">{customer.company}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-[#efeeff] px-3 py-1 text-xs font-semibold text-[#514bff]">{customer.status}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => setFormDialog({ mode: 'edit', customer })} className="font-semibold text-[#514bff] hover:underline">Edit</button>
                          <button type="button" onClick={() => setDeleteCustomer(customer)} className="font-semibold text-[#d65363] hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="mt-4 flex flex-col gap-3 text-sm text-[#71869a] sm:flex-row sm:items-center sm:justify-between">
              <p>Showing {Math.min((page - 1) * limit + 1, pagination?.total ?? 0)}–{Math.min(page * limit, pagination?.total ?? 0)} of {pagination?.total ?? 0}</p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <label className="flex items-center gap-2">
                  <span className="sr-only">Rows per page</span>
                  <select value={limit} onChange={(event) => updateQuery({ limit: event.target.value, page: null })}
                    className="h-9 rounded-md border border-[#e1eaf2] bg-white px-2 text-sm text-[#24435f]">
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </label>
                <span>Page {Math.min(page, totalPages)} of {totalPages}</span>
                <button type="button" disabled={page <= 1} onClick={() => updateQuery({ page: String(page - 1) })}
                  className="h-9 rounded-md border border-[#e1eaf2] bg-white px-3 font-semibold text-[#24435f] disabled:opacity-40">Previous</button>
                <button type="button" disabled={page >= totalPages} onClick={() => updateQuery({ page: String(page + 1) })}
                  className="h-9 rounded-md border border-[#e1eaf2] bg-white px-3 font-semibold text-[#24435f] disabled:opacity-40">Next</button>
              </div>
            </footer>
          </>
        )}
      </section>

      {formDialog && (
        <CustomerFormDialog
          customer={formDialog.mode === 'edit' ? formDialog.customer : undefined}
          onClose={() => setFormDialog(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteCustomer && (
        <DeleteCustomerDialog customerId={deleteCustomer.id} customerName={deleteCustomer.name}
          onClose={() => setDeleteCustomer(null)} onDeleted={handleDeleted} />
      )}
    </main>
    </CustomerShell>
  )
}