import { useState, type FormEvent } from 'react'
import { getFormErrorMessage, validateFormFields, type FormFieldErrors } from '@/lib/apiClient'
import CustomerPickerDialog from '@/components/deals/CustomerPickerDialog'
import type { Customer } from '@/lib/customersApi'
import type { Deal } from '@/lib/dealsApi'
import { TASK_PRIORITIES, tasksApi, type Task, type TaskDeal, type TaskInput } from '@/lib/tasksApi'
import DealPickerDialog from './DealPickerDialog'

interface TaskFormDialogProps {
  task?: Task
  onClose: () => void
  onSaved: (task: Task) => void
}

export default function TaskFormDialog({ task, onClose, onSaved }: TaskFormDialogProps) {
  const [customer, setCustomer] = useState<Task['customer']>(task?.customer ?? null)
  const [deal, setDeal] = useState<TaskDeal | null>(task?.deal ?? null)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showDealPicker, setShowDealPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({})
  const isEditing = Boolean(task)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const validationErrors = validateFormFields(formElement, {
      title: 'Title',
      dueDate: 'Due date',
      priority: 'Priority',
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
    const data: TaskInput = {
      title: String(form.get('title') ?? '').trim(),
      dueDate: String(form.get('dueDate') ?? ''),
      priority: String(form.get('priority')) as TaskInput['priority'],
      customer: customer?.id ?? null,
      deal: deal?.id ?? null,
    }

    try {
      const response = task
        ? await tasksApi.update(task.id, data)
        : await tasksApi.create(data)
      onSaved(response.task)
    } catch (submitError) {
      setError(getFormErrorMessage(submitError, 'Unable to save this task. Try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  function selectCustomer(selected: Customer) {
    setCustomer({ id: selected.id, name: selected.name, company: selected.company, email: selected.email })
    setShowCustomerPicker(false)
  }

  function selectDeal(selected: Deal) {
    setDeal({
      id: selected.id,
      title: selected.title,
      value: selected.value,
      stage: selected.stage,
    })
    setShowDealPicker(false)
  }

  return (
    <>
      <div className="crm-modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#123553]/35 p-3 sm:items-center sm:p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="task-form-title"
          className="crm-dialog my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[560px] overflow-y-auto rounded-xl border border-[#e1eaf2] bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-7">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 id="task-form-title" className="text-xl font-bold text-[#123553]">{isEditing ? 'Edit Task' : 'Add Task'}</h2>
              <p className="mt-1 text-sm text-[#8297a9]">Task information</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close task form" className="rounded-lg px-2 py-1 text-sm text-[#71869a] hover:bg-[#f3f8fc]">Close</button>
          </header>

          <form noValidate onSubmit={handleSubmit} onChange={() => { setFieldErrors({}); setError('') }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-[#24435f] sm:col-span-2">
              Title
              <input name="title" required maxLength={160} defaultValue={task?.title ?? ''} autoFocus
                aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'task-title-error' : undefined}
                className={`crm-input ${fieldErrors.title ? 'border-[#d65363]' : ''}`} />
              {fieldErrors.title && <span id="task-title-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.title}</span>}
            </label>
            <label className="text-sm font-semibold text-[#24435f]">
              Due date
              <input name="dueDate" type="date" required defaultValue={task?.dueDate.slice(0, 10) ?? ''}
                aria-invalid={Boolean(fieldErrors.dueDate)} aria-describedby={fieldErrors.dueDate ? 'task-due-date-error' : undefined}
                className={`crm-input ${fieldErrors.dueDate ? 'border-[#d65363]' : ''}`} />
              {fieldErrors.dueDate && <span id="task-due-date-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.dueDate}</span>}
            </label>
            <label className="text-sm font-semibold text-[#24435f]">
              Priority
              <select name="priority" required defaultValue={task?.priority ?? 'Medium'}
                aria-invalid={Boolean(fieldErrors.priority)} aria-describedby={fieldErrors.priority ? 'task-priority-error' : undefined}
                className={`crm-input ${fieldErrors.priority ? 'border-[#d65363]' : ''}`}>
                {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              {fieldErrors.priority && <span id="task-priority-error" className="mt-1 block text-xs font-medium text-[#c0394b]">{fieldErrors.priority}</span>}
            </label>
            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-[#24435f]">Customer <span className="font-normal text-[#8297a9]">(optional)</span></span>
              {customer ? (
                <div className="mt-2 flex items-center gap-3 rounded-md border border-[#e1eaf2] bg-[#f7faff] p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#123553]">{customer.name}</span>
                    <span className="block truncate text-xs text-[#8297a9]">{customer.company} · {customer.email}</span>
                  </span>
                  <button type="button" onClick={() => setShowCustomerPicker(true)} className="shrink-0 text-sm font-semibold text-[#514bff]">Change</button>
                  <button type="button" onClick={() => setCustomer(null)} className="shrink-0 text-sm font-semibold text-[#71869a]">Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowCustomerPicker(true)}
                  className="mt-2 h-11 w-full rounded-md border border-[#dfe9f1] bg-[#f3f8fc] px-3 text-left text-sm text-[#8297a9] hover:border-[#514bff]">
                  Select a customer
                </button>
              )}
            </div>
            <div className="sm:col-span-2">
              <span className="text-sm font-semibold text-[#24435f]">Deal <span className="font-normal text-[#8297a9]">(optional)</span></span>
              {deal ? (
                <div className="mt-2 flex items-center gap-3 rounded-md border border-[#e1eaf2] bg-[#f7faff] p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#123553]">{deal.title}</span>
                    <span className="block truncate text-xs text-[#8297a9]">{deal.stage}</span>
                  </span>
                  <button type="button" onClick={() => setShowDealPicker(true)} className="shrink-0 text-sm font-semibold text-[#514bff]">Change</button>
                  <button type="button" onClick={() => setDeal(null)} className="shrink-0 text-sm font-semibold text-[#71869a]">Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowDealPicker(true)}
                  className="mt-2 h-11 w-full rounded-md border border-[#dfe9f1] bg-[#f3f8fc] px-3 text-left text-sm text-[#8297a9] hover:border-[#514bff]">
                  Select a deal
                </button>
              )}
            </div>

            {error && <p role="alert" className="text-sm text-[#d65363] sm:col-span-2">{error}</p>}
            <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:col-span-2 sm:flex-row">
              <button type="button" onClick={onClose} disabled={submitting}
                className="h-11 rounded-md border border-[#dfe9f1] px-5 text-sm font-semibold text-[#516b80] disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={submitting}
                className="h-11 rounded-md bg-[#514bff] px-5 text-sm font-semibold text-white hover:bg-[#403be8] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </section>
      </div>
      {showCustomerPicker && (
        <CustomerPickerDialog onClose={() => setShowCustomerPicker(false)} onSelect={selectCustomer} />
      )}
      {showDealPicker && (
        <DealPickerDialog onClose={() => setShowDealPicker(false)} onSelect={selectDeal} />
      )}
    </>
  )
}
