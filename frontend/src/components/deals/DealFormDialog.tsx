import { useState, type FormEvent } from 'react'
import { ApiError } from '@/lib/apiClient'
import { DEAL_STAGES, dealsApi, type Deal, type DealInput } from '@/lib/dealsApi'
import type { Customer } from '@/lib/customersApi'
import CustomerPickerDialog from './CustomerPickerDialog'

interface DealFormDialogProps {
  deal?: Deal
  onClose: () => void
  onSaved: (deal: Deal) => void
}

export default function DealFormDialog({ deal, onClose, onSaved }: DealFormDialogProps) {
  const [customer, setCustomer] = useState<Customer | null>(deal?.customer ? {
    ...deal.customer,
    phone: '',
    status: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
  } : null)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isEditing = Boolean(deal)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!customer) {
      setError('Select a customer for this deal.')
      return
    }
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const data: DealInput = {
      title: String(form.get('title') ?? '').trim(),
      value: Number(form.get('value')),
      stage: String(form.get('stage')) as DealInput['stage'],
      expectedCloseDate: String(form.get('expectedCloseDate')),
      customer: customer.id,
    }

    try {
      const response = deal
        ? await dealsApi.update(deal.id, data)
        : await dealsApi.create(data)
      onSaved(response.deal)
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Unable to save this deal. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#123553]/35 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="deal-form-title"
          className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[560px] overflow-y-auto rounded-lg border border-[#e1eaf2] bg-white p-5 shadow-xl sm:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="deal-form-title" className="text-xl font-bold text-[#123553]">{isEditing ? 'Edit Deal' : 'Add Deal'}</h2>
              <p className="mt-1 text-sm text-[#8297a9]">Deal information</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close deal form" className="rounded-md px-2 py-1 text-sm text-[#71869a] hover:bg-[#f3f8fc]">Close</button>
          </header>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
              Title
              <input name="title" required maxLength={160} defaultValue={deal?.title ?? ''} autoFocus className="crm-input" />
            </label>
            <label className="text-sm font-semibold text-[#24435f]">
              Value
              <input name="value" type="number" required min="0" step="0.01" defaultValue={deal?.value ?? ''} className="crm-input" />
            </label>
            <label className="text-sm font-semibold text-[#24435f]">
              Stage
              <select name="stage" defaultValue={deal?.stage ?? 'Lead'} className="crm-input">
                {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
              Expected close date
              <input name="expectedCloseDate" type="date" required
                defaultValue={deal?.expectedCloseDate.slice(0, 10) ?? ''} className="crm-input" />
            </label>
            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-[#24435f]">Customer</span>
              {customer ? (
                <div className="mt-2 flex items-center gap-3 rounded-md border border-[#e1eaf2] bg-[#f7faff] p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eaf0f5] text-xs font-semibold text-[#71869a]">
                    {customer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#123553]">{customer.name}</span>
                    <span className="block truncate text-xs text-[#8297a9]">{customer.company} · {customer.email}</span>
                  </span>
                  <button type="button" onClick={() => setShowCustomerPicker(true)} className="shrink-0 text-sm font-semibold text-[#514bff]">Change</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowCustomerPicker(true)}
                  className="mt-2 h-11 w-full rounded-md border border-[#dfe9f1] bg-[#f3f8fc] px-3 text-left text-sm text-[#8297a9] hover:border-[#514bff]">
                  Select a customer
                </button>
              )}
            </div>

            {error && <p role="alert" className="text-sm text-[#d65363] sm:col-span-2">{error}</p>}
            <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:col-span-2 sm:flex-row">
              <button type="button" onClick={onClose} disabled={submitting}
                className="h-11 rounded-md border border-[#dfe9f1] px-5 text-sm font-semibold text-[#516b80] disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={submitting}
                className="h-11 rounded-md bg-[#514bff] px-5 text-sm font-semibold text-white hover:bg-[#403be8] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Deal'}
              </button>
            </div>
          </form>
        </section>
      </div>
      {showCustomerPicker && (
        <CustomerPickerDialog onClose={() => setShowCustomerPicker(false)} onSelect={(selected) => {
          setCustomer(selected)
          setShowCustomerPicker(false)
          setError('')
        }} />
      )}
    </>
  )
}