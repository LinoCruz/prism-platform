'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { fetchTasksPage, fetchTaskDetails } from './actions'
import type { AdminTask, TaskStatusFilter } from '@/services/admin'

const PAGE_SIZE = 20

const ALL_STATUSES = ['available', 'reserved', 'claimed', 'in_review', 'rework', 'signed_off'] as const

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-500/20 text-green-300 border-green-500/30',
  reserved:  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  claimed:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  in_review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  rework:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  signed_off:'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

type TaskDetails = Awaited<ReturnType<typeof fetchTaskDetails>>

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <span className={`inline-block border-2 border-current/30 border-t-current rounded-full animate-spin ${className}`} />
}

function InfoCard({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface/50 border border-border/50 p-3">
      <span className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</span>
      <span className={`text-sm text-primary break-all ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${STATUS_BADGE[status] ?? 'bg-border/20 text-muted border-border/30'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

function TaskDetailPane({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [details, setDetails] = useState<TaskDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setDetails(null)
    fetchTaskDetails(taskId)
      .then(setDetails)
      .catch(e => toast.error(e instanceof Error ? e.message : 'Failed to load task details.'))
      .finally(() => setLoading(false))
  }, [taskId])

  return (
    <div className="mt-4 rounded-2xl border border-accent/30 bg-surface/30 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h3 className="text-base font-semibold text-primary">Task Details</h3>
          {details && (
            <p className="text-xs text-muted mt-0.5 font-mono">{details.task.external_id}</p>
          )}
        </div>
        <button onClick={onClose} className="text-muted hover:text-primary transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="w-5 h-5 text-accent" />
        </div>
      ) : !details ? null : (
        <div className="flex flex-col gap-6">
          {/* IDs & Overview */}
          <section>
            <h4 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <InfoCard label="External ID (General)" value={details.task.external_id} mono />
              <InfoCard label="Internal ID" value={details.task.task_id} mono />
              <div className="flex flex-col gap-1 rounded-xl bg-surface/50 border border-border/50 p-3">
                <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Status</span>
                <StatusBadge status={details.task.status} />
              </div>
              <InfoCard label="Created" value={new Date(details.task.created_at).toLocaleString()} />
              {details.task.final_signedoff_at && (
                <InfoCard label="Signed Off" value={new Date(details.task.final_signedoff_at).toLocaleString()} />
              )}
              {details.task.reserved_for_id && (
                <InfoCard
                  label="Assigned To"
                  value={details.userMap[details.task.reserved_for_id]?.email ?? details.task.reserved_for_id.slice(0, 8) + '…'}
                />
              )}
              {details.task.reservation_expires_at && (
                <InfoCard label="Reservation Expires" value={new Date(details.task.reservation_expires_at).toLocaleString()} />
              )}
              {details.task.current_version_id && (
                <InfoCard label="Current Version ID" value={details.task.current_version_id} mono />
              )}
            </div>
          </section>

          {/* Question */}
          {details.task.question && (
            <section>
              <h4 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">Question</h4>
              <div className="rounded-xl bg-surface/50 border border-border/50 p-4 text-sm text-primary whitespace-pre-wrap leading-relaxed">
                {details.task.question}
              </div>
            </section>
          )}

          {/* Attempt History */}
          <section>
            <h4 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">
              Attempt History ({details.attempts.length})
            </h4>
            {details.attempts.length === 0 ? (
              <p className="text-xs text-muted/60">No attempts yet.</p>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface/30 text-secondary">
                      <th className="p-2.5 font-medium">#</th>
                      <th className="p-2.5 font-medium">Trainer</th>
                      <th className="p-2.5 font-medium">Claimed At</th>
                      <th className="p-2.5 font-medium">Submitted At</th>
                      <th className="p-2.5 font-medium">Attempt ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.attempts.map(a => (
                      <tr key={a.attempt_id} className="border-b border-border/50 hover:bg-surface-hover/40">
                        <td className="p-2.5 text-muted">{a.attempt_number}</td>
                        <td className="p-2.5 text-primary">
                          {details.userMap[a.trainer_id]?.email ?? a.trainer_id.slice(0, 8) + '…'}
                        </td>
                        <td className="p-2.5 text-muted tabular-nums">{new Date(a.claimed_at).toLocaleString()}</td>
                        <td className="p-2.5 text-muted tabular-nums">
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : <span className="text-muted/40">—</span>}
                        </td>
                        <td className="p-2.5 text-muted/60 font-mono">{a.attempt_id.slice(0, 8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Review History */}
          <section>
            <h4 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">
              Review History ({details.reviews.length})
            </h4>
            {details.reviews.length === 0 ? (
              <p className="text-xs text-muted/60">No reviews yet.</p>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface/30 text-secondary">
                      <th className="p-2.5 font-medium">#</th>
                      <th className="p-2.5 font-medium">Reviewer</th>
                      <th className="p-2.5 font-medium">Decision</th>
                      <th className="p-2.5 font-medium">Score</th>
                      <th className="p-2.5 font-medium">Started</th>
                      <th className="p-2.5 font-medium">Completed</th>
                      <th className="p-2.5 font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.reviews.map(r => (
                      <tr key={r.review_id} className="border-b border-border/50 hover:bg-surface-hover/40 align-top">
                        <td className="p-2.5 text-muted">{r.review_number}</td>
                        <td className="p-2.5 text-primary">
                          {details.userMap[r.reviewer_id]?.email ?? r.reviewer_id.slice(0, 8) + '…'}
                        </td>
                        <td className="p-2.5">
                          {r.decision ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${
                              r.decision === 'approved'
                                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            }`}>
                              {r.decision}
                            </span>
                          ) : <span className="text-muted/40">—</span>}
                        </td>
                        <td className="p-2.5 text-muted tabular-nums">{r.score ?? '—'}</td>
                        <td className="p-2.5 text-muted tabular-nums">{new Date(r.started_at).toLocaleString()}</td>
                        <td className="p-2.5 text-muted tabular-nums">
                          {r.completed_at ? new Date(r.completed_at).toLocaleString() : <span className="text-muted/40">—</span>}
                        </td>
                        <td className="p-2.5 text-muted max-w-xs">
                          <span className="line-clamp-2">{r.feedback ?? '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function TaskInspectorPanel() {
  const [tasks, setTasks]               = useState<AdminTask[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(0)
  const [idSearch, setIdSearch]         = useState('')
  const [questionSearch, setQuestionSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter | 'all'>('all')
  const [appliedId, setAppliedId]       = useState('')
  const [appliedQuestion, setAppliedQuestion] = useState('')
  const [appliedStatus, setAppliedStatus]   = useState<TaskStatusFilter>('all')
  const [isLoading, setIsLoading]       = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [hasSearched, setHasSearched]   = useState(false)

  const loadTasks = useCallback(async (p: number, id: string, question: string, status: TaskStatusFilter) => {
    setIsLoading(true)
    try {
      const result = await fetchTasksPage({ page: p, pageSize: PAGE_SIZE, search: id, statusFilter: status, questionSearch: question })
      setTasks(result.tasks)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load tasks.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleSearch() {
    const status = statusFilter as TaskStatusFilter
    setPage(0)
    setSelectedTaskId(null)
    setAppliedId(idSearch)
    setAppliedQuestion(questionSearch)
    setAppliedStatus(status)
    setHasSearched(true)
    loadTasks(0, idSearch, questionSearch, status)
  }

  function handleClear() {
    setIdSearch('')
    setQuestionSearch('')
    setStatusFilter('all')
    setAppliedId('')
    setAppliedQuestion('')
    setAppliedStatus('all')
    setPage(0)
    setSelectedTaskId(null)
    setTasks([])
    setTotal(0)
    setHasSearched(false)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setSelectedTaskId(null)
    loadTasks(newPage, appliedId, appliedQuestion, appliedStatus)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-medium mb-1">Task Management</h2>
        <p className="text-sm text-muted mb-6">Search and inspect tasks. Click a row to see full task history and details.</p>
      </div>

      {/* Search Form */}
      <div className="rounded-2xl border border-border/50 bg-surface/30 p-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* External ID */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary">External ID</label>
            <input
              type="text"
              value={idSearch}
              onChange={e => setIdSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. TASK-001…"
              className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent placeholder:text-muted"
            />
          </div>

          {/* Question keyword */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary">Question Keyword</label>
            <input
              type="text"
              value={questionSearch}
              onChange={e => setQuestionSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search in question text…"
              className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent placeholder:text-muted"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as TaskStatusFilter)}
              className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            >
              <option value="all">All statuses</option>
              <option value="free">Free (unassigned)</option>
              <option value="assigned">Assigned</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSearch}
            className="rounded-xl bg-accent/20 border border-accent/50 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/30 transition-all"
          >
            Search
          </button>
          {hasSearched && (
            <button
              onClick={handleClear}
              className="rounded-xl border border-border px-4 py-2 text-sm text-muted hover:text-primary hover:border-border/80 transition-all"
            >
              Clear
            </button>
          )}
          {hasSearched && (
            <span className="text-xs text-muted ml-1">
              {total} result{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Results Table */}
      {hasSearched && (
        <>
          <div className="rounded-2xl border border-border/50 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/30 text-xs text-secondary">
                  <th className="p-3 font-medium">External ID</th>
                  <th className="p-3 font-medium">Internal ID</th>
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
                      onClick={() => setSelectedTaskId(selectedTaskId === task.task_id ? null : task.task_id)}
                      className={`border-b border-border/50 hover:bg-surface-hover/50 transition-colors cursor-pointer ${
                        selectedTaskId === task.task_id ? 'bg-accent/5 border-l-2 border-l-accent/50' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-xs text-accent whitespace-nowrap">{task.external_id}</td>
                      <td className="p-3 font-mono text-xs text-muted/70 whitespace-nowrap">{task.task_id.slice(0, 8)}…</td>
                      <td className="p-3 text-primary max-w-xs">
                        <span className="line-clamp-2 text-sm">{task.question}</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="p-3 text-muted text-xs whitespace-nowrap">
                        {task.reserved_for_email ?? (task.reserved_for_id ? `${task.reserved_for_id.slice(0, 8)}…` : '—')}
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
                  onClick={() => handlePageChange(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => handlePageChange(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Task Detail */}
          {selectedTaskId && (
            <TaskDetailPane
              key={selectedTaskId}
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          )}
        </>
      )}

      {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted text-sm">Use the filters above to search for tasks.</p>
        </div>
      )}
    </div>
  )
}
