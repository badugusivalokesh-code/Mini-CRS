import { useState } from 'react'
import { tasksApi } from '@/lib/tasksApi'

interface DeleteTaskDialogProps {
  task: { id: string; title: string }
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteTaskDialog({ task, onClose, onDeleted }: DeleteTaskDialogProps) {
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    setDeleting(true)
    setError('')
    try {
      await tasksApi.delete(task.id)
      onDeleted()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this task.')
      setDeleting(false)
    }
  }

  return (
    <div className="crm-modal-backdrop fixed inset-0 z-50 flex items-start justify-center bg-[#123553]/35 p-3 sm:items-center sm:p-4" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="delete-task-title"
        className="crm-dialog w-full max-w-[420px] rounded-xl border border-[#e1eaf2] bg-white p-5 shadow-xl sm:p-6">
        <h2 id="delete-task-title" className="text-lg font-bold text-[#123553]">Delete task?</h2>
        <p className="mt-3 text-sm leading-6 text-[#71869a]">
          This will permanently delete <span className="font-semibold text-[#24435f]">{task.title}</span>.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-[#d65363]">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={deleting}
            className="h-10 rounded-md border border-[#dfe9f1] px-4 text-sm font-semibold text-[#516b80] disabled:opacity-60">Cancel</button>
          <button type="button" onClick={confirmDelete} disabled={deleting}
            className="h-10 rounded-md bg-[#df5f70] px-4 text-sm font-semibold text-white hover:bg-[#c94d5e] disabled:cursor-not-allowed disabled:opacity-60">
            {deleting ? 'Deleting...' : 'Delete Task'}
          </button>
        </div>
      </section>
    </div>
  )
}
