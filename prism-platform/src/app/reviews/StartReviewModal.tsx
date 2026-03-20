'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { PrismStripes } from '@/components/PrismStripes'
import {
  fetchTaskContentAction,
  startReviewAction,
  completeReviewAction,
  startTimeSegmentAction,
  heartbeatAction,
  endTimeSegmentAction,
} from './actions'
import type { TaskContent } from './actions'
import type { ReviewerEdits } from '@/services/reviews'

type Decision = 'approved' | 'fixed_and_approved' | 'rework'
type ModalState = 'idle' | 'loading' | 'open' | 'submitting'

interface Props {
  taskId: string
  versionId: string
  externalId: string
  attemptCount: number
}

function Spinner() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
}

function Label({ text }: { text: string }) {
  return <span className="text-xs font-medium uppercase tracking-widest text-muted">{text}</span>
}

function ReadonlyBlock({ value }: { value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/30 px-3 py-2.5 text-sm text-primary whitespace-pre-wrap leading-relaxed">
      {value}
    </div>
  )
}

function EditableBlock({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder={placeholder}
      className="w-full rounded-xl border border-accent/40 bg-surface/50 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-muted resize-none"
    />
  )
}

function BoolBadge({ value }: { value: boolean }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      value
        ? 'bg-green-500/15 border-green-500/40 text-green-400'
        : 'bg-red-500/15 border-red-500/40 text-red-400'
    }`}>
      {value ? 'Yes' : 'No'}
    </span>
  )
}

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            value === v
              ? 'bg-accent/20 border-accent/60 text-accent'
              : 'border-border text-muted hover:border-border/80 hover:text-primary'
          }`}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

function ContentField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label text={label} />
      {children}
    </div>
  )
}

function TaskContentView({
  content,
  editable,
  edits,
  onEdit,
}: {
  content: TaskContent
  editable: boolean
  edits: ReviewerEdits
  onEdit: (patch: Partial<ReviewerEdits>) => void
}) {
  const hasQAFields = content.original_question || content.original_answer

  return (
    <div className="flex flex-col gap-5">
      {content.question && (
        <ContentField label="Task Question">
          <ReadonlyBlock value={content.question} />
        </ContentField>
      )}

      {hasQAFields && <div className="border-t border-border/50" />}

      {content.original_question && (
        <ContentField label="Original Question">
          <ReadonlyBlock value={content.original_question} />
        </ContentField>
      )}
      {content.original_answer && (
        <ContentField label="Original Answer">
          <ReadonlyBlock value={content.original_answer} />
        </ContentField>
      )}

      {/* Question validity */}
      {(content.is_question_valid !== null || editable) && (
        <ContentField label="Question Valid?">
          {editable
            ? <YesNoToggle value={edits.is_question_valid ?? content.is_question_valid ?? null} onChange={(v) => onEdit({ is_question_valid: v })} />
            : content.is_question_valid !== null && <BoolBadge value={content.is_question_valid} />
          }
        </ContentField>
      )}
      {(content.question_invalid_reason || editable) && (
        <ContentField label="Question Invalid Reason">
          {editable
            ? <EditableBlock value={edits.question_invalid_reason ?? content.question_invalid_reason ?? ''} onChange={(v) => onEdit({ question_invalid_reason: v })} placeholder="Explain why…" />
            : content.question_invalid_reason && <ReadonlyBlock value={content.question_invalid_reason} />
          }
        </ContentField>
      )}
      {(content.new_question || editable) && (
        <ContentField label="New Question">
          {editable
            ? <EditableBlock value={edits.new_question ?? content.new_question ?? ''} onChange={(v) => onEdit({ new_question: v })} placeholder="Write the corrected question…" />
            : content.new_question && <ReadonlyBlock value={content.new_question} />
          }
        </ContentField>
      )}

      <div className="border-t border-border/50" />

      {/* Answer validity */}
      {(content.is_answer_valid !== null || editable) && (
        <ContentField label="Answer Valid?">
          {editable
            ? <YesNoToggle value={edits.is_answer_valid ?? content.is_answer_valid ?? null} onChange={(v) => onEdit({ is_answer_valid: v })} />
            : content.is_answer_valid !== null && <BoolBadge value={content.is_answer_valid} />
          }
        </ContentField>
      )}
      {(content.answer_invalid_reason || editable) && (
        <ContentField label="Answer Invalid Reason">
          {editable
            ? <EditableBlock value={edits.answer_invalid_reason ?? content.answer_invalid_reason ?? ''} onChange={(v) => onEdit({ answer_invalid_reason: v })} placeholder="Explain why…" />
            : content.answer_invalid_reason && <ReadonlyBlock value={content.answer_invalid_reason} />
          }
        </ContentField>
      )}
      {(content.new_answer || editable) && (
        <ContentField label="New Answer">
          {editable
            ? <EditableBlock value={edits.new_answer ?? content.new_answer ?? ''} onChange={(v) => onEdit({ new_answer: v })} placeholder="Write the corrected answer…" />
            : content.new_answer && <ReadonlyBlock value={content.new_answer} />
          }
        </ContentField>
      )}

      {/* Temporal */}
      {content.is_temporal !== null && (
        <ContentField label="Temporal?">
          <BoolBadge value={content.is_temporal} />
        </ContentField>
      )}
      {content.is_temporal && content.temporal_values.length > 0 && (
        <ContentField label="Temporal Values">
          <div className="flex flex-wrap gap-2">
            {content.temporal_values.map((v, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg border border-border bg-surface/30 text-sm text-primary font-mono">
                {v}
              </span>
            ))}
          </div>
        </ContentField>
      )}

      {/* Fallback */}
      {!content.question && !hasQAFields && !content.dataPayload && (
        <p className="text-sm text-muted italic">No content available for this task.</p>
      )}
      {!hasQAFields && content.dataPayload && Object.keys(content.dataPayload).length > 0 && (
        <ContentField label="Submitted Data">
          <ReadonlyBlock value={JSON.stringify(content.dataPayload, null, 2)} />
        </ContentField>
      )}
    </div>
  )
}

const DECISIONS: { value: Decision; label: string; colors: string; activeColors: string }[] = [
  {
    value: 'approved',
    label: 'Approve',
    colors: 'border-border text-muted hover:border-border/80 hover:text-primary',
    activeColors: 'bg-green-500/20 border-green-500/50 text-green-400',
  },
  {
    value: 'fixed_and_approved',
    label: 'Fix & Approve',
    colors: 'border-border text-muted hover:border-border/80 hover:text-primary',
    activeColors: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  },
  {
    value: 'rework',
    label: 'Send for Rework',
    colors: 'border-border text-muted hover:border-border/80 hover:text-primary',
    activeColors: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  },
]

export function StartReviewModal({ taskId, versionId, externalId, attemptCount }: Props) {
  const [state, setState] = useState<ModalState>('idle')
  const [content, setContent] = useState<TaskContent | null>(null)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [edits, setEdits] = useState<ReviewerEdits>({})
  const [score, setScore] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [timeId, setTimeId] = useState<string | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isBusy = state === 'loading' || state === 'submitting'
  const isOpen = state === 'open' || state === 'submitting'
  const isEditing = decision === 'fixed_and_approved'

  // Start/stop heartbeat when modal is open and timeId is known
  useEffect(() => {
    if (state !== 'open' || !timeId) return
    heartbeatRef.current = setInterval(() => {
      heartbeatAction(timeId)
    }, 60_000)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [state, timeId])

  function patchEdits(patch: Partial<ReviewerEdits>) {
    setEdits((prev) => ({ ...prev, ...patch }))
  }

  async function handleOpen() {
    if (isBusy || isOpen) return
    setState('loading')
    setError(null)

    const [contentResult, reviewResult] = await Promise.all([
      fetchTaskContentAction(taskId),
      startReviewAction(taskId, versionId),
    ])

    if (contentResult.error) { setError(contentResult.error); setState('idle'); return }
    if (reviewResult.error) { setError(reviewResult.error); setState('idle'); return }

    const newReviewId = reviewResult.reviewId!
    setContent(contentResult.content ?? null)
    setReviewId(newReviewId)

    const timeResult = await startTimeSegmentAction(taskId, 'review', newReviewId, 'reviewer')
    if (timeResult.timeId) setTimeId(timeResult.timeId)

    setState('open')
  }

  function handleClose() {
    if (state === 'submitting') return
    if (timeId) endTimeSegmentAction(timeId)
    setState('idle')
    setDecision(null)
    setEdits({})
    setScore('')
    setFeedback('')
    setError(null)
    setReviewId(null)
    setTimeId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!decision) { setError('Please select a decision.'); return }
    const scoreNum = parseFloat(score)
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) { setError('Score must be between 1 and 5.'); return }
    if (!feedback.trim()) { setError('Feedback is required.'); return }
    if (!reviewId) { setError('Review session lost. Please close and try again.'); return }

    setState('submitting')
    setError(null)

    // Close time segment before submitting
    if (timeId) endTimeSegmentAction(timeId)

    const result = await completeReviewAction(
      reviewId,
      decision,
      scoreNum,
      feedback,
      isEditing ? edits : undefined,
    )

    if (result.error) {
      setError(result.error)
      setState('open')
      return
    }

    setState('idle')
    setDecision(null)
    setEdits({})
    setScore('')
    setFeedback('')
    setReviewId(null)
    setTimeId(null)

    const outcomeLabel =
      decision === 'approved' ? 'approved' :
      decision === 'fixed_and_approved' ? 'fixed and approved' :
      'sent back for rework'

    toast.success('Review submitted!', {
      description: `Task ${externalId} has been ${outcomeLabel}.`,
      duration: 6000,
    })
  }

  const modal = isOpen
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col mb-10">
            <PrismStripes variant="horizontal" thickness={6} className="absolute top-0 left-0 right-0 z-20 opacity-70" />

            {/* Header */}
            <div className="relative z-10 px-6 pt-8 pb-4 shrink-0 border-b border-border">
              <p className="font-mono text-xs text-muted">{externalId}</p>
              <h2 className="text-lg font-semibold text-primary mt-0.5">Review Submission</h2>
              <p className="text-sm text-secondary mt-1">
                {attemptCount} attempt{attemptCount !== 1 ? 's' : ''} · Review and leave your decision below.
              </p>
            </div>

            {/* Task content */}
            <div className="relative z-10 px-6 py-5 border-b border-border bg-black/30">
              <div className="flex items-center gap-2 mb-5">
                <p className="text-xs font-medium uppercase tracking-widest text-muted">Submitted Content</p>
                {isEditing && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[10px] font-medium text-blue-400">
                    Editing
                  </span>
                )}
              </div>
              {content && (
                <TaskContentView
                  content={content}
                  editable={isEditing}
                  edits={edits}
                  onEdit={patchEdits}
                />
              )}
            </div>

            {/* Review form */}
            <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5 px-6 py-6">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">Your Review</p>

              {/* Decision */}
              <div className="flex flex-col gap-1.5">
                <Label text="Decision" />
                <div className="flex gap-2 flex-wrap">
                  {DECISIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => { setDecision(d.value); setEdits({}) }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        decision === d.value ? d.activeColors : d.colors
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {isEditing && (
                  <p className="text-xs text-blue-400/80 mt-1">
                    The fields above are now editable. Make your corrections before submitting.
                  </p>
                )}
              </div>

              {/* Score */}
              <div className="flex flex-col gap-1.5">
                <Label text="Score (1–5)" />
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  min={1}
                  max={5}
                  step={1}
                  placeholder="e.g. 4"
                  className="w-40 rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-muted"
                />
              </div>

              {/* Feedback */}
              <div className="flex flex-col gap-1.5">
                <Label text="Feedback" />
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Leave detailed feedback for the trainer…"
                  className="w-full rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-muted resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent/20 border border-accent/50 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {state === 'submitting' ? <><Spinner /> Submitting…</> : 'Submit Review'}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleClose}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted hover:text-primary hover:border-border/80 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        type="button"
        disabled={isBusy || isOpen}
        onClick={handleOpen}
        className="rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === 'loading' ? (
          <span className="flex items-center gap-2"><Spinner /> Loading…</span>
        ) : isOpen ? (
          'Reviewing…'
        ) : (
          'Start Review'
        )}
      </button>

      {error && !isOpen && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {modal}
    </>
  )
}
