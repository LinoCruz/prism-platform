'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { fetchTasksPage, fetchTaskDetails, fetchActiveTrainers, submitDisclaimTask, submitReassignTask } from './actions'
import type { AdminTask, TaskStatusFilter } from '@/services/admin'

const PAGE_SIZE = 20

const ALL_STATUSES = ['available', 'reserved', 'claimed', 'completed', 'in_review', 'sent_for_rework', 'reworking', 'fixed', 'approved', 'auditing', 'reviewer_fixing', 'signed_off', 'delivered', 'canceled'] as const

const STATUS_BADGE: Record<string, string> = {
  available:       'bg-green-500/20 text-green-300 border-green-500/30',
  reserved:        'bg-orange-500/20 text-orange-300 border-orange-500/30',
  claimed:         'bg-blue-500/20 text-blue-300 border-blue-500/30',
  completed:       'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  in_review:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sent_for_rework: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  fixed:           'bg-teal-500/20 text-teal-300 border-teal-500/30',
  approved:        'bg-green-500/20 text-green-300 border-green-500/30',
  auditing:        'bg-violet-500/20 text-violet-300 border-violet-500/30',
  reviewer_fixing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  signed_off:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  delivered:       'bg-slate-500/20 text-slate-300 border-slate-500/30',
  canceled:        'bg-red-500/20 text-red-300 border-red-500/30',
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
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${Math.floor(seconds)}s`
}

// ─── Version Content Modal ────────────────────────────────────────────────────

type VersionRow = Awaited<ReturnType<typeof fetchTaskDetails>>['versions'][number]

function VersionContentModal({ version, onClose }: { version: VersionRow; onClose: () => void }) {
  const formatted = JSON.stringify(version.data_payload, null, 2)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-primary">Version {version.version_number} · {version.source}</h3>
            <p className="text-xs text-muted mt-0.5">{new Date(version.created_at).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-auto flex-1 p-5">
          <pre className="text-xs font-mono text-primary whitespace-pre-wrap break-all leading-relaxed">{formatted}</pre>
        </div>
      </div>
    </div>
  )
}

// ─── Timeline Components ───────────────────────────────────────────────────────

function ReviewCard({ review, details }: {
  review: TaskDetails['reviews'][number]
  details: TaskDetails
}) {
  const tracked = details.timeMap[review.review_id]
  return (
    <div className="rounded-xl border border-purple-500/20 bg-surface/30 p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-semibold text-purple-400">Review #{review.review_number}</span>
        {review.decision && (
          <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${
            review.decision === 'approved'
              ? 'bg-green-500/20 text-green-300 border-green-500/30'
              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
          }`}>{review.decision.replaceAll('_', ' ')}</span>
        )}
        {review.score != null && (
          <span className="text-[10px] text-muted border border-border/50 bg-surface/50 px-2 py-0.5 rounded-full">Score: {review.score}</span>
        )}
        {!review.completed_at && (
          <span className="text-[10px] border border-purple-500/30 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">In progress</span>
        )}
        <span className="ml-auto text-[10px] text-muted/50 font-mono">{review.review_id.slice(0, 8)}…</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted/60">Reviewer</span>
          <p className="text-primary mt-0.5 truncate">{details.userMap[review.reviewer_id]?.email ?? review.reviewer_id.slice(0, 8) + '…'}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted/60">Started</span>
          <p className="text-muted mt-0.5 tabular-nums">{new Date(review.started_at).toLocaleString()}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted/60">Completed</span>
          <p className="text-muted mt-0.5 tabular-nums">
            {review.completed_at ? new Date(review.completed_at).toLocaleString() : <span className="text-muted/40">—</span>}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wide text-muted/60">Active Time</span>
          <p className="text-muted mt-0.5">{tracked && tracked > 0 ? formatDuration(tracked) : <span className="text-muted/40">—</span>}</p>
        </div>
      </div>
      {review.feedback && (
        <div className="mt-2 pt-2 border-t border-border/30">
          <span className="text-[10px] uppercase tracking-wide text-muted/60">Feedback</span>
          <p className="text-xs text-muted mt-0.5 leading-relaxed whitespace-pre-wrap">{review.feedback}</p>
        </div>
      )}
    </div>
  )
}

function TaskTimeline({ details, onViewContent }: {
  details: TaskDetails
  onViewContent: (v: VersionRow) => void
}) {
  const versionMap = Object.fromEntries((details.versions ?? []).map(v => [v.version_id, v]))

  // Primary index: version_id → reviews
  const reviewsByVersion: Record<string, TaskDetails['reviews']> = {}
  for (const r of details.reviews) {
    if (r.version_id) {
      reviewsByVersion[r.version_id] ??= []
      reviewsByVersion[r.version_id].push(r)
    }
  }

  // Assign reviews to attempts: prefer version_id match, fall back to time window
  const assignedReviewIds = new Set<string>()
  const attemptReviewsMap: Record<string, TaskDetails['reviews']> = {}

  for (let i = 0; i < details.attempts.length; i++) {
    const attempt = details.attempts[i]
    const nextAttempt = details.attempts[i + 1]

    if (attempt.version_id && reviewsByVersion[attempt.version_id]) {
      // Happy path: link by version_id
      attemptReviewsMap[attempt.attempt_id] = reviewsByVersion[attempt.version_id]
    } else if (attempt.submitted_at) {
      // Fallback: reviews that started after submission and before the next attempt was claimed
      const submitMs = new Date(attempt.submitted_at).getTime()
      const nextClaimMs = nextAttempt ? new Date(nextAttempt.claimed_at).getTime() : Infinity
      attemptReviewsMap[attempt.attempt_id] = details.reviews.filter(r => {
        if (r.version_id) return false // belongs to a version-linked attempt
        const startMs = new Date(r.started_at).getTime()
        return startMs >= submitMs && startMs < nextClaimMs
      })
    } else {
      attemptReviewsMap[attempt.attempt_id] = []
    }

    attemptReviewsMap[attempt.attempt_id].forEach(r => assignedReviewIds.add(r.review_id))
  }

  const orphanReviews = details.reviews.filter(r => !assignedReviewIds.has(r.review_id))

  if (details.attempts.length === 0 && details.reviews.length === 0) {
    return <p className="text-xs text-muted/60">No activity yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {details.attempts.map(attempt => {
        const version = attempt.version_id ? versionMap[attempt.version_id] : null
        const reviews = attemptReviewsMap[attempt.attempt_id] ?? []
        const reworkReview = attempt.rework_due_to_review_id
          ? details.reviews.find(r => r.review_id === attempt.rework_due_to_review_id)
          : null
        const tracked = details.timeMap[attempt.attempt_id]
        const wallClock = (!tracked && attempt.submitted_at)
          ? Math.max(0, new Date(attempt.submitted_at).getTime() - new Date(attempt.claimed_at).getTime()) / 1000
          : null

        return (
          <div key={attempt.attempt_id} className="flex flex-col gap-2">
            <div className="rounded-xl border border-blue-500/20 bg-surface/30 p-3">
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-blue-400">Attempt #{attempt.attempt_number}</span>
                  {reworkReview && (
                    <span className="text-[10px] border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">
                      Rework of Review #{reworkReview.review_number}
                    </span>
                  )}
                  {!attempt.submitted_at && (
                    <span className="text-[10px] border border-blue-500/30 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">In progress</span>
                  )}
                  <span className="text-[10px] text-muted/50 font-mono">{attempt.attempt_id.slice(0, 8)}…</span>
                </div>
                {version && (
                  <button
                    onClick={() => onViewContent(version)}
                    className="shrink-0 text-[10px] font-medium text-accent hover:text-accent/80 border border-accent/30 bg-accent/10 hover:bg-accent/20 px-2.5 py-1 rounded-lg transition-all"
                  >
                    View Content (v{version.version_number})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-muted/60">Trainer</span>
                  <p className="text-primary mt-0.5 truncate">{details.userMap[attempt.trainer_id]?.email ?? attempt.trainer_id.slice(0, 8) + '…'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-muted/60">Claimed</span>
                  <p className="text-muted mt-0.5 tabular-nums">{new Date(attempt.claimed_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-muted/60">Submitted</span>
                  <p className="text-muted mt-0.5 tabular-nums">
                    {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : <span className="text-muted/40">In progress…</span>}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-muted/60">Active Time</span>
                  <p className="text-muted mt-0.5">
                    {tracked && tracked > 0
                      ? formatDuration(tracked)
                      : wallClock && wallClock > 0
                        ? <span className="opacity-60" title="Wall-clock estimate">{formatDuration(wallClock)}</span>
                        : <span className="text-muted/40">—</span>
                    }
                  </p>
                </div>
              </div>
            </div>

            {reviews.length > 0 && (
              <div className="ml-4 flex flex-col gap-2">
                {reviews.map(review => (
                  <ReviewCard key={review.review_id} review={review} details={details} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {orphanReviews.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-[10px] uppercase tracking-widest text-muted/60 font-medium">Unlinked Reviews</p>
          {orphanReviews.map(review => (
            <ReviewCard key={review.review_id} review={review} details={details} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Task Detail Panel ────────────────────────────────────────────────────────

type Trainer = { user_id: string; display_name: string; email: string; role: string }

function AdminActionsSection({ taskId, status, onActionDone }: { taskId: string; status: string; onActionDone: () => void }) {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [selectedExpert, setSelectedExpert] = useState('')
  const [busy, setBusy] = useState(false)

  const canAct = ['reserved', 'claimed'].includes(status)

  const [loadingTrainers, setLoadingTrainers] = useState(canAct)

  useEffect(() => {
    if (!canAct) return
    fetchActiveTrainers()
      .then(setTrainers)
      .catch(() => toast.error('Failed to load trainers.'))
      .finally(() => setLoadingTrainers(false))
  }, [canAct])

  if (!canAct) return null

  async function handleDisclaim() {
    setBusy(true)
    const result = await submitDisclaimTask(taskId)
    setBusy(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Task disclaimed and made available.')
    onActionDone()
  }

  async function handleReassign() {
    if (!selectedExpert) { toast.error('Select an expert first.'); return }
    setBusy(true)
    const result = await submitReassignTask(taskId, selectedExpert)
    setBusy(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Task reassigned.')
    onActionDone()
  }

  return (
    <section>
      <h4 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">Admin Actions</h4>
      <div className="rounded-xl border border-border/50 bg-surface/30 p-4 flex flex-col gap-4">
        {/* Disclaim */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-primary font-medium">Disclaim Task</p>
            <p className="text-xs text-muted mt-0.5">Remove from current trainer and make available to anyone.</p>
          </div>
          <button
            disabled={busy}
            onClick={handleDisclaim}
            className="shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disclaim
          </button>
        </div>

        {/* Reassign */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-primary font-medium">Reassign to Expert</p>
          <p className="text-xs text-muted">Remove from current trainer and reserve for a different expert.</p>
          <div className="flex gap-2 mt-1">
            <select
              value={selectedExpert}
              onChange={e => setSelectedExpert(e.target.value)}
              disabled={loadingTrainers || busy}
              className="flex-1 rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-50"
            >
              <option value="">{loadingTrainers ? 'Loading…' : 'Select expert…'}</option>
              {trainers.map(t => (
                <option key={t.user_id} value={t.user_id}>
                  {t.display_name || t.email} ({t.role})
                </option>
              ))}
            </select>
            <button
              disabled={busy || !selectedExpert}
              onClick={handleReassign}
              className="shrink-0 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-medium text-accent hover:bg-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reassign
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function TaskDetailPane({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [details, setDetails] = useState<TaskDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewingVersion, setViewingVersion] = useState<VersionRow | null>(null)

  useEffect(() => {
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

          {/* Full Task History */}
          <section>
            <h4 className="text-xs uppercase tracking-widest text-muted font-medium mb-3">
              Full Task History ({details.attempts.length} attempt{details.attempts.length !== 1 ? 's' : ''}, {details.reviews.length} review{details.reviews.length !== 1 ? 's' : ''})
            </h4>
            <TaskTimeline details={details} onViewContent={setViewingVersion} />
          </section>

          {/* Admin Actions */}
          <AdminActionsSection
            taskId={details.task.task_id}
            status={details.task.status}
            onActionDone={onClose}
          />
        </div>
      )}

      {viewingVersion && (
        <VersionContentModal version={viewingVersion} onClose={() => setViewingVersion(null)} />
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
  const [taskIdSearch, setTaskIdSearch] = useState('')
  const [attemptIdSearch, setAttemptIdSearch] = useState('')
  const [expertEmailSearch, setExpertEmailSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter | 'all'>('all')
  const [applied, setApplied] = useState({ id: '', question: '', taskId: '', attemptId: '', expertEmail: '', status: 'all' as TaskStatusFilter })
  const [isLoading, setIsLoading]       = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [hasSearched, setHasSearched]   = useState(false)

  const loadTasks = useCallback(async (p: number, params: typeof applied) => {
    setIsLoading(true)
    try {
      const result = await fetchTasksPage({
        page: p,
        pageSize: PAGE_SIZE,
        search: params.id,
        statusFilter: params.status,
        questionSearch: params.question,
        taskIdSearch: params.taskId,
        attemptIdSearch: params.attemptId,
        expertEmailSearch: params.expertEmail,
      })
      setTasks(result.tasks)
      setTotal(result.total)
    } catch {
      toast.error('Failed to load tasks.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  function handleSearch() {
    const params = {
      id: idSearch,
      question: questionSearch,
      taskId: taskIdSearch,
      attemptId: attemptIdSearch,
      expertEmail: expertEmailSearch,
      status: statusFilter as TaskStatusFilter,
    }
    setPage(0)
    setSelectedTaskId(null)
    setApplied(params)
    setHasSearched(true)
    loadTasks(0, params)
  }

  function handleClear() {
    setIdSearch('')
    setQuestionSearch('')
    setTaskIdSearch('')
    setAttemptIdSearch('')
    setExpertEmailSearch('')
    setStatusFilter('all')
    setApplied({ id: '', question: '', taskId: '', attemptId: '', expertEmail: '', status: 'all' })
    setPage(0)
    setSelectedTaskId(null)
    setTasks([])
    setTotal(0)
    setHasSearched(false)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    setSelectedTaskId(null)
    loadTasks(newPage, applied)
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
                <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Internal Task ID */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary">Internal Task ID</label>
            <input
              type="text"
              value={taskIdSearch}
              onChange={e => setTaskIdSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="UUID or partial…"
              className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent placeholder:text-muted font-mono"
            />
          </div>

          {/* Attempt ID */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary">Attempt ID</label>
            <input
              type="text"
              value={attemptIdSearch}
              onChange={e => setAttemptIdSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="UUID or partial…"
              className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent placeholder:text-muted font-mono"
            />
          </div>

          {/* Expert Email */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-secondary">Expert Email</label>
            <input
              type="text"
              value={expertEmailSearch}
              onChange={e => setExpertEmailSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="micro1 email…"
              className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent placeholder:text-muted"
            />
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
