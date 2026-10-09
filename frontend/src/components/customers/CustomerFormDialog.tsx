import { useState, type FormEvent } from 'react'
import { getFormErrorMessage, validateFormFields, type FormFieldErrors } from '@/lib/apiClient'
import { customersApi, type Customer, type CustomerInput } from '@/lib/customersApi'

interface CustomerFormDialogProps {
  customer?: Customer
  onClose: () => void
  onSaved: (customer: Customer) => void
}

export default function CustomerFormDialog({ customer, onClose, onSaved }: CustomerFormDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({})
  const isEditing = Boolean(customer)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const validationErrors = validateFormFields(formElement, {
      name: 'Name',
      company: 'Company',
      email: 'Email',
      phone: 'Phone',
      status: 'Status',
      notes: 'Notes',
    })
    setFieldErrors(validationErrors)
    setError('')
    if (Object.keys(validationErrors).length > 0) {
      const firstInvalid = formElement.elements.namedItem(Object.keys(validationErrors)[0])
      if (firstInvalid instanceof HTMLElement) firstInvalid.focus()
      return
    }

    setSubmitting(true)
    const form = new FormData(formElement)
    const data: CustomerInput = {
      name: String(form.get('name') ?? '').trim(),
      company: String(form.get('company') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      status: String(form.get('status') ?? '').trim(),
      notes: String(form.get('notes') ?? '').trim(),
    }

    try {
      const response = customer
        ? await customersApi.update(customer.id, data)
        : await customersApi.create(data)
      onSaved(response.customer)
    } catch (submitError) {
      setError(getFormErrorMessage(submitError, 'Unable to save this customer. Try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="crm-modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#123553]/35 p-3 sm:items-center sm:p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
        className="crm-dialog my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[560px] overflow-y-auto rounded-xl border border-[#e1eaf2] bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-7"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="customer-form-title" className="text-xl font-bold text-[#123553]">
              {isEditing ? 'Edit Customer' : 'Add Customer'}
            </h2>
            <p className="mt-1 text-sm text-[#8297a9]">Customer information</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-[#71869a] hover:bg-[#f3f8fc]">
            Close
          </button>
        </header>

        <form noValidate onSubmit={handleSubmit} onChange={() => { setFieldErrors({}); setError('') }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#24435f]">
            Name
            <input name="name" required maxLength={120} defaultValue={customer?.name ?? ''} autoFocus
              aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'customer-name-error' : undefined}
              className={`crm-input ${fieldErrors.name ? 'border-[#d65363]' : ''}`} />
            {fieldErrors.name && <span id="customer-name-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.name}</span>}
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Company
            <input name="company" required maxLength={160} defaultValue={customer?.company ?? ''}
              aria-invalid={Boolean(fieldErrors.company)} aria-describedby={fieldErrors.company ? 'customer-company-error' : undefined}
              className={`crm-input ${fieldErrors.company ? 'border-[#d65363]' : ''}`} />
            {fieldErrors.company && <span id="customer-company-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.company}</span>}
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Email
            <input name="email" type="email" required maxLength={254} defaultValue={customer?.email ?? ''}
              aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'customer-email-error' : undefined}
              className={`crm-input ${fieldErrors.email ? 'border-[#d65363]' : ''}`} />
            {fieldErrors.email && <span id="customer-email-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.email}</span>}
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Phone
            <input name="phone" type="tel" required maxLength={40} defaultValue={customer?.phone ?? ''}
              aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'customer-phone-error' : undefined}
              className={`crm-input ${fieldErrors.phone ? 'border-[#d65363]' : ''}`} />
            {fieldErrors.phone && <span id="customer-phone-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.phone}</span>}
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Status
            <input name="status" required maxLength={40} placeholder="Enter a status"
              defaultValue={customer?.status ?? ''} aria-invalid={Boolean(fieldErrors.status)}
              aria-describedby={fieldErrors.status ? 'customer-status-error' : undefined}
              className={`crm-input ${fieldErrors.status ? 'border-[#d65363]' : ''}`} />
            {fieldErrors.status && <span id="customer-status-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.status}</span>}
          </label>
          <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
            Notes
            <textarea name="notes" maxLength={2000} rows={3} defaultValue={customer?.notes ?? ''}
              aria-invalid={Boolean(fieldErrors.notes)} aria-describedby={fieldErrors.notes ? 'customer-notes-error' : undefined}
              className={`crm-input h-auto min-h-[88px] py-3 ${fieldErrors.notes ? 'border-[#d65363]' : ''}`} />
            {fieldErrors.notes && <span id="customer-notes-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.notes}</span>}
          </label>

          {error && <p role="alert" className="text-sm text-[#d65363] sm:col-span-2">{error}</p>}
          <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:col-span-2 sm:flex-row">
            <button type="button" onClick={onClose} disabled={submitting}
              className="h-11 rounded-md border border-[#dfe9f1] px-5 text-sm font-semibold text-[#516b80] hover:bg-[#f3f8fc] disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="h-11 rounded-md bg-[#514bff] px-5 text-sm font-semibold text-white hover:bg-[#403be8] disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Customer'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}