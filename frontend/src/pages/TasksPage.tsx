import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CustomerShell from '@/components/customers/CustomerShell'
import DeleteTaskDialog from '@/components/tasks/DeleteTaskDialog'
import TaskFormDialog from '@/components/tasks/TaskFormDialog'
import { tasksApi, type Task } from '@/lib/tasksApi'

type TaskDialogState = { mode: 'create' } | { mode: 'edit'; task: Task } | null

function formatDueDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [dialog, setDialog] = useState<TaskDialogState>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    tasksApi.list()
      .then(({ tasks: records }) => {
        if (active) setTasks(records)
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load tasks.')
          setTasks([])
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [refresh])

  async function toggleCompleted(task: Task) {
    setUpdatingId(task.id)
    setError('')
    try {
      const { task: updated } = await tasksApi.update(task.id, { completed: !task.completed })
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item))
      setNotice(`${updated.title} marked ${updated.completed ? 'complete' : 'incomplete'}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update task.')
    } finally {
      setUpdatingId(null)
    }
  }

  function handleSaved(task: Task) {
    const wasEditing = dialog?.mode === 'edit'
    setTasks((current) => wasEditing
      ? current.map((item) => item.id === task.id ? task : item)
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      : [...current, task].sort((left, right) => left.dueDate.localeCompare(right.dueDate)))
    setNotice(`${task.title} ${wasEditing ? 'updated' : 'created'}.`)
    setDialog(null)
  }

  function handleDeleted() {
    setTasks((current) => current.filter((task) => task.id !== deleteTask?.id))
    setNotice('Task deleted.')
    setDeleteTask(null)
  }

  return (
    <CustomerShell>
      <main className="min-h-screen bg-[#f3f8fc] text-[#123553]">
        <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e5edf4] bg-white px-4 py-3 sm:px-8 lg:px-10">
          <div>
            <Link to="/" className="text-xs font-medium text-[#8297a9] hover:text-[#514bff]">Clientra</Link>
            <h1 className="mt-0.5 text-xl font-bold">Tasks</h1>
          </div>
          <button type="button" onClick={() => setDialog({ mode: 'create' })}
            className="h-10 whitespace-nowrap rounded-lg bg-[#514bff] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#403be8] hover:shadow sm:px-5">
            Add Task <span aria-hidden="true" className="ml-1">+</span>
          </button>
        </header>

        <section className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8 sm:py-9">
          {notice && <p role="status" className="crm-status mb-4 rounded-lg bg-[#eaf8f4] px-4 py-3 text-sm text-[#147b66]">{notice}</p>}
          {error && (
            <section className="mb-4 rounded-lg border border-[#f2cbd0] bg-white p-5">
              <p role="alert" className="text-sm text-[#d65363]">{error}</p>
              {tasks.length === 0 && !loading && (
                <button type="button" onClick={() => setRefresh((count) => count + 1)} className="mt-3 text-sm font-semibold text-[#514bff]">Try again</button>
              )}
            </section>
          )}

          {loading && tasks.length === 0 && (
            <p role="status" className="rounded-lg border border-[#e1eaf2] bg-white px-5 py-12 text-center text-sm text-[#8297a9]">Loading tasks...</p>
          )}
          {!loading && !error && tasks.length === 0 && (
            <section className="rounded-lg border border-[#e1eaf2] bg-white px-5 py-14 text-center">
              <h2 className="font-semibold">No tasks yet</h2>
              <p className="mt-2 text-sm text-[#8297a9]">Add a task to keep track of your follow-ups.</p>
              <button type="button" onClick={() => setDialog({ mode: 'create' })}
                className="mt-5 h-10 rounded-md bg-[#514bff] px-4 text-sm font-semibold text-white hover:bg-[#403be8]">
                Add Task
              </button>
            </section>
          )}

          {!loading && tasks.length > 0 && (
            <div className="space-y-3">
              <p className="mb-4 text-sm font-semibold">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</p>
              {tasks.map((task) => (
                <article key={task.id} className={`crm-card rounded-xl border bg-white p-4 shadow-[0_2px_8px_rgba(18,53,83,0.035)] sm:p-5 ${task.overdue ? 'border-[#f2cbd0]' : 'border-[#e1eaf2]'}`}>
                  <div className="flex min-w-0 items-start gap-3">
                    <input type="checkbox" checked={task.completed} disabled={updatingId === task.id}
                      onChange={() => { void toggleCompleted(task) }}
                      aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
                      className="mt-1 size-4 shrink-0 accent-[#514bff] disabled:opacity-60" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className={`break-words text-sm font-bold ${task.completed ? 'text-[#8297a9] line-through' : 'text-[#123553]'}`}>{task.title}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${task.priority === 'High' ? 'bg-[#fff0f0] text-[#c74f60]' : task.priority === 'Medium' ? 'bg-[#fff6e8] text-[#a76b14]' : 'bg-[#edf4f8] text-[#60798d]'}`}>
                          {task.priority}
                        </span>
                        {task.overdue && !task.completed && <span className="rounded-full bg-[#fff0f0] px-2.5 py-1 text-[11px] font-semibold text-[#c74f60]">Overdue</span>}
                        {task.completed && <span className="rounded-full bg-[#eaf8f4] px-2.5 py-1 text-[11px] font-semibold text-[#147b66]">Done</span>}
                      </div>
                      <p className={`mt-2 text-xs ${task.overdue && !task.completed ? 'font-semibold text-[#c74f60]' : 'text-[#71869a]'}`}>
                        Due {formatDueDate(task.dueDate)}
                      </p>
                      {(task.customer || task.deal) && (
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#71869a]">
                          {task.customer && <span className="min-w-0 truncate">Customer: <span className="font-semibold text-[#24435f]">{task.customer.name}</span></span>}
                          {task.deal && <span className="min-w-0 truncate">Deal: <span className="font-semibold text-[#24435f]">{task.deal.title}</span></span>}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs font-semibold sm:gap-4">
                      <button type="button" onClick={() => setDialog({ mode: 'edit', task })} className="text-[#514bff] hover:underline">Edit</button>
                      <button type="button" onClick={() => setDeleteTask(task)} className="text-[#d65363] hover:underline">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      {dialog && (
        <TaskFormDialog task={dialog.mode === 'edit' ? dialog.task : undefined}
          onClose={() => setDialog(null)} onSaved={handleSaved} />
      )}
      {deleteTask && <DeleteTaskDialog task={deleteTask} onClose={() => setDeleteTask(null)} onDeleted={handleDeleted} />}
    </CustomerShell>
  )
}
