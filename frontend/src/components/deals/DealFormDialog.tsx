import { useState, type FormEvent } from 'react'
import { getFormErrorMessage, validateFormFields, type FormFieldErrors } from '@/lib/apiClient'
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
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({})
  const isEditing = Boolean(deal)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const validationErrors = validateFormFields(formElement, {
      title: 'Title',
      value: 'Value',
      stage: 'Stage',
      expectedCloseDate: 'Expected close date',
    })
    if (!customer) validationErrors.customer = 'Select a customer for this deal.'
    setFieldErrors(validationErrors)
    setError('')
    if (Object.keys(validationErrors).length > 0) {
      const firstField = Object.keys(validationErrors)[0]
      const firstInvalid = firstField === 'customer'
        ? document.getElementById('deal-customer-select')
        : formElement.elements.namedItem(firstField)
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus()
      return
    }
    if (!customer) return

    setSubmitting(true)
    const form = new FormData(formElement)
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
      setError(getFormErrorMessage(submitError, 'Unable to save this deal. Try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="crm-modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#123553]/35 p-3 sm:items-center sm:p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="deal-form-title"
          className="crm-dialog my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[560px] overflow-y-auto rounded-xl border border-[#e1eaf2] bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="deal-form-title" className="text-xl font-bold text-[#123553]">{isEditing ? 'Edit Deal' : 'Add Deal'}</h2>
              <p className="mt-1 text-sm text-[#8297a9]">Deal information</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close deal form" className="rounded-lg px-2 py-1 text-sm text-[#71869a] hover:bg-[#f3f8fc]">Close</button>
          </header>

          <form noValidate onSubmit={handleSubmit} onChange={() => { setFieldErrors({}); setError('') }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
              Title
              <input name="title" required maxLength={160} defaultValue={deal?.title ?? ''} autoFocus
                aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'deal-title-error' : undefined}
                className={`crm-input ${fieldErrors.title ? 'border-[#d65363]' : ''}`} />
              {fieldErrors.title && <span id="deal-title-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.title}</span>}
            </label>
            <label className="text-sm font-semibold text-[#24435f]">
              Value
              <input name="value" type="number" required min="0" step="0.01" defaultValue={deal?.value ?? ''}
                aria-invalid={Boolean(fieldErrors.value)} aria-describedby={fieldErrors.value ? 'deal-value-error' : undefined}
                className={`crm-input ${fieldErrors.value ? 'border-[#d65363]' : ''}`} />
              {fieldErrors.value && <span id="deal-value-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.value}</span>}
            </label>
            <label className="text-sm font-semibold text-[#24435f]">
              Stage
              <select name="stage" required defaultValue={deal?.stage ?? 'Lead'}
                aria-invalid={Boolean(fieldErrors.stage)} aria-describedby={fieldErrors.stage ? 'deal-stage-error' : undefined}
                className={`crm-input ${fieldErrors.stage ? 'border-[#d65363]' : ''}`}>
                {DEAL_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
              {fieldErrors.stage && <span id="deal-stage-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.stage}</span>}
            </label>
            <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
              Expected close date
              <input name="expectedCloseDate" type="date" required
                defaultValue={deal?.expectedCloseDate.slice(0, 10) ?? ''}
                aria-invalid={Boolean(fieldErrors.expectedCloseDate)}
                aria-describedby={fieldErrors.expectedCloseDate ? 'deal-close-date-error' : undefined}
                className={`crm-input ${fieldErrors.expectedCloseDate ? 'border-[#d65363]' : ''}`} />
              {fieldErrors.expectedCloseDate && <span id="deal-close-date-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.expectedCloseDate}</span>}
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
                <button id="deal-customer-select" type="button" onClick={() => setShowCustomerPicker(true)}
                  aria-invalid={Boolean(fieldErrors.customer)} aria-describedby={fieldErrors.customer ? 'deal-customer-error' : undefined}
                  className={`mt-2 h-11 w-full rounded-md border bg-[#f3f8fc] px-3 text-left text-sm text-[#8297a9] hover:border-[#514bff] ${fieldErrors.customer ? 'border-[#d65363]' : 'border-[#dfe9f1]'}`}>
                  Select a customer
                </button>
              )}
              {fieldErrors.customer && <p id="deal-customer-error" className="mt-1 text-xs font-medium text-[#c0394b]">{fieldErrors.customer}</p>}
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
          setFieldErrors((current) => {
            const remaining = { ...current }
            delete remaining.customer
            return remaining
          })
          setError('')
        }} />
      )}
    </>
  )
}