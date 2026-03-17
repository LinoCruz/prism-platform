'use client'

import { useState, useCallback, useEffect, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { fetchTasksPage, fetchActiveTrainers, submitTaskAssignment } from './actions'
import type { AdminTask, TaskStatusFilter } from '@/services/admin'

const PAGE_SIZE = 20

type Expert = { user_id: string; display_name: string; email: string }
type AssignMode = 'random' | 'selected'

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-500/20 text-green-300 border-green-500/30',
  reserved:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  claimed:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  rework:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  signed_off:'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

function isFree(task: AdminTask) {
  return task.status === 'available' && !task.reserved_for_id
}

function statusLabel(task: AdminTask) {
  if (isFree(task)) return 'free'
  return task.status.replace('_', ' ')
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
    </svg>
  )
}

function XIcon({ size = 4 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <span className={`inline-block border-2 border-current/30 border-t-current rounded-full animate-spin ${className}`} />
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TasksManagementPanel() {
  const [tasks, setTasks]               = useState<AdminTask[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(0)
  const [searchInput, setSearchInput]   = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all')
  const [isLoading, setIsLoading]       = useState(false)
  const [selected, setSelected]         = useState<Set<string>>(new Set())

  // Assignment modal
  const [showAssign, setShowAssign]       = useState(false)
  const [experts, setExperts]             = useState<Expert[]>([])
  const [loadingExperts, setLoadingExperts] = useState(false)
  const [selectedExpert, setSelectedExpert] = useState('')
  const [assignCount, setAssignCount]     = useState(5)
  const [assignMode, setAssignMode]       = useState<AssignMode>('random')
  const [isAssigning, startAssignTransition] = useTransition()

  const indeterminateRef = useRef<HTMLInputElement | null>(null)

  const loadTasks = useCallback(async (p: number, search: string, filter: TaskStatusFilter) => {
    setIsLoading(true)
    try {
      const result = await fetchTasksPage({ page: p, pageSize: PAGE_SIZE, search, statusFilter: filter })
      setTasks(result.tasks)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load tasks.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks(page, appliedSearch, statusFilter)
  }, [page, appliedSearch, statusFilter, loadTasks])

  // Sync indeterminate state on the select-all checkbox
  useEffect(() => {
    const el = indeterminateRef.current
    if (!el) return
    el.indeterminate = selected.size > 0 && selected.size < tasks.length
  }, [selected.size, tasks.length])

  function handleSearch() {
    setPage(0)
    setSelected(new Set())
    setAppliedSearch(searchInput)
  }

  function handleClearSearch() {
    setSearchInput('')
    setAppliedSearch('')
    setPage(0)
    setSelected(new Set())
  }

  function handleFilterChange(f: TaskStatusFilter) {
    setStatusFilter(f)
    setPage(0)
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(selected.size === tasks.length && tasks.length > 0 ? new Set() : new Set(tasks.map(t => t.task_id)))
  }

  async function openAssignModal() {
    setShowAssign(true)
    setLoadingExperts(true)
    try {
      const data = await fetchActiveTrainers()
      setExperts(data)
    } catch {
      toast.error('Failed to load experts.')
    } finally {
      setLoadingExperts(false)
    }
  }

  function handleAssign() {
    if (!selectedExpert) { toast.error('Please select an expert.'); return }
    if (assignMode === 'selected' && selected.size === 0) { toast.error('No tasks selected.'); return }

    startAssignTransition(async () => {
      const fd = new FormData()
      fd.set('expertId', selectedExpert)
      if (assignMode === 'random') {
        fd.set('count', assignCount.toString())
      } else {
        fd.set('taskIds', Array.from(selected).join(','))
      }
      try {
        const result = await submitTaskAssignment(fd)
        toast.success(`Assigned ${result.assigned} task${result.assigned !== 1 ? 's' : ''} successfully.`)
        setShowAssign(false)
        setSelected(new Set())
        loadTasks(page, appliedSearch, statusFilter)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to assign tasks.')
      }
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium mb-1">Task Management</h2>
        <p className="text-sm text-muted mb-6">View, search, and pre-assign tasks to experts.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface/50 px-3 py-2 flex-1 min-w-52 max-w-sm">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search by task ID…"
            className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="text-muted hover:text-primary transition-colors">
              <XIcon size={3} />
            </button>
          )}
          <button onClick={handleSearch} className="text-muted hover:text-accent transition-colors ml-1">
            <SearchIcon />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-surface/50 p-1">
          {(['all', 'free', 'assigned'] as const).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === f
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'text-muted hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Assign button */}
        <button
          onClick={openAssignModal}
          className="ml-auto rounded-xl border border-border bg-surface/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 hover:text-white transition-all"
        >
          Assign Tasks
        </button>
      </div>

      {/* Stats */}
      <p className="text-xs text-muted">
        {total} task{total !== 1 ? 's' : ''}
        {appliedSearch && <span className="ml-1 text-accent/70">matching &ldquo;{appliedSearch}&rdquo;</span>}
        {selected.size > 0 && <span className="ml-2 text-accent">&bull; {selected.size} selected</span>}
      </p>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface/30 text-xs text-secondary">
              <th className="p-3 w-10">
                <input
                  ref={indeterminateRef}
                  type="checkbox"
                  checked={tasks.length > 0 && selected.size === tasks.length}
                  onChange={toggleSelectAll}
                  className="accent-orange-400"
                />
              </th>
              <th className="p-3 font-medium">Task ID</th>
              <th className="p-3 font-medium">Question</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Assigned To</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  <Spinner className="w-5 h-5 text-accent mx-auto" />
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted text-sm">No tasks found.</td>
              </tr>
            ) : (
              tasks.map(task => (
                <tr
                  key={task.task_id}
                  className={`border-b border-border/50 hover:bg-surface-hover/50 transition-colors ${selected.has(task.task_id) ? 'bg-accent/5' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(task.task_id)}
                      onChange={() => toggleSelect(task.task_id)}
                      className="accent-orange-400"
                    />
                  </td>
                  <td className="p-3 font-mono text-xs text-accent whitespace-nowrap">{task.external_id}</td>
                  <td className="p-3 text-primary max-w-xs">
                    <span className="line-clamp-2 text-sm">{task.question}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${STATUS_BADGE[task.status] ?? 'bg-border/20 text-muted border-border/30'}`}>
                      {statusLabel(task)}
                    </span>
                  </td>
                  <td className="p-3 text-muted text-xs whitespace-nowrap">
                    {task.reserved_for_name ?? (task.reserved_for_id ? `${task.reserved_for_id.slice(0, 8)}…` : '—')}
                  </td>
                  <td className="p-3 text-muted text-xs tabular-nums whitespace-nowrap">
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-medium">Pre-assign Tasks</h3>
              <button onClick={() => setShowAssign(false)} className="text-muted hover:text-primary transition-colors">
                <XIcon size={5} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Expert picker */}
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Expert</label>
                {loadingExperts ? (
                  <div className="flex items-center gap-2 text-muted text-xs">
                    <Spinner className="w-3 h-3" /> Loading experts…
                  </div>
                ) : (
                  <select
                    value={selectedExpert}
                    onChange={e => setSelectedExpert(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="">Select an expert…</option>
                    {experts.map(ex => (
                      <option key={ex.user_id} value={ex.user_id}>
                        {ex.display_name} ({ex.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Mode */}
              <div>
                <label className="text-xs text-secondary mb-1.5 block">Assignment Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAssignMode('random')}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-all ${
                      assignMode === 'random'
                        ? 'border-accent/60 bg-accent/10 text-accent'
                        : 'border-border text-muted hover:text-primary'
                    }`}
                  >
                    Random
                  </button>
                  <button
                    onClick={() => setAssignMode('selected')}
                    disabled={selected.size === 0}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      assignMode === 'selected'
                        ? 'border-accent/60 bg-accent/10 text-accent'
                        : 'border-border text-muted hover:text-primary'
                    }`}
                  >
                    Selected ({selected.size})
                  </button>
                </div>
                {assignMode === 'selected' && selected.size === 0 && (
                  <p className="text-xs text-muted/60 mt-1">Select tasks from the table first.</p>
                )}
              </div>

              {/* Count for random mode */}
              {assignMode === 'random' && (
                <div>
                  <label className="text-xs text-secondary mb-1.5 block">Number of Tasks</label>
                  <input
                    type="number"
                    min={1}
                    value={assignCount}
                    onChange={e => setAssignCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                  />
                  <p className="text-xs text-muted/60 mt-1">Tasks are picked randomly from free (unassigned) tasks.</p>
                </div>
              )}

              {assignMode === 'selected' && selected.size > 0 && (
                <p className="text-xs text-muted/60 -mt-1">
                  {selected.size} task{selected.size !== 1 ? 's' : ''} will be reserved for the selected expert.
                </p>
              )}

              <button
                onClick={handleAssign}
                disabled={isAssigning || !selectedExpert || (assignMode === 'selected' && selected.size === 0)}
                className="w-full rounded-xl bg-accent/20 border border-accent/50 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAssigning && <Spinner className="w-4 h-4" />}
                {isAssigning ? 'Assigning…' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
