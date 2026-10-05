import { useState, type FormEvent } from 'react'
import { ApiError } from '@/lib/apiClient'
import { customersApi, type Customer, type CustomerInput } from '@/lib/customersApi'

interface CustomerFormDialogProps {
  customer?: Customer
  onClose: () => void
  onSaved: (customer: Customer) => void
}

export default function CustomerFormDialog({ customer, onClose, onSaved }: CustomerFormDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isEditing = Boolean(customer)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const form = new FormData(event.currentTarget)
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
      setError(submitError instanceof ApiError ? submitError.message : 'Unable to save this customer. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#123553]/35 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[560px] overflow-y-auto rounded-lg border border-[#e1eaf2] bg-white p-5 shadow-xl sm:p-7"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="customer-form-title" className="text-xl font-bold text-[#123553]">
              {isEditing ? 'Edit Customer' : 'Add Customer'}
            </h2>
            <p className="mt-1 text-sm text-[#8297a9]">Customer information</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-[#71869a] hover:bg-[#f3f8fc]">
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#24435f]">
            Name
            <input name="name" required maxLength={120} defaultValue={customer?.name ?? ''} autoFocus
              className="crm-input" />
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Company
            <input name="company" required maxLength={160} defaultValue={customer?.company ?? ''}
              className="crm-input" />
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Email
            <input name="email" type="email" required maxLength={254} defaultValue={customer?.email ?? ''}
              className="crm-input" />
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Phone
            <input name="phone" type="tel" required maxLength={40} defaultValue={customer?.phone ?? ''}
              className="crm-input" />
          </label>
          <label className="text-sm font-semibold text-[#24435f]">
            Status
            <input name="status" required maxLength={40} placeholder="Enter a status"
              defaultValue={customer?.status ?? ''} className="crm-input" />
          </label>
          <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
            Notes
            <textarea name="notes" maxLength={2000} rows={3} defaultValue={customer?.notes ?? ''}
              className="crm-input h-auto min-h-[88px] py-3" />
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