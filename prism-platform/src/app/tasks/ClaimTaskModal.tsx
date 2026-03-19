'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { PrismStripes } from '@/components/PrismStripes'
import { startTaskAction, cancelTaskAction, finishTaskAction } from './actions'

type ModalState = 'idle' | 'starting' | 'open' | 'submitting' | 'cancelling'

interface Props {
  taskId: string
  externalId: string
  onSubmitted?: () => void
}

function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
  )
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-2">
      {[true, false].map((v) => (
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-secondary">{label}</label>
      {children}
    </div>
  )
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-muted resize-none"
    />
  )
}

const emptyQA = {
  originalQuestion: '',
  originalAnswer: '',
  isQuestionValid: null as boolean | null,
  questionInvalidReason: '',
  newQuestion: '',
  isAnswerValid: null as boolean | null,
  answerInvalidReason: '',
  newAnswer: '',
  isTemporal: null as boolean | null,
  temporalValues: [] as string[],
}

export function ClaimTaskModal({ taskId, externalId, onSubmitted }: Props) {
  const [state, setState] = useState<ModalState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [qa, setQA] = useState(emptyQA)

  const isBusy = state === 'starting' || state === 'submitting' || state === 'cancelling'
  const isModalVisible = state === 'open' || state === 'submitting' || state === 'cancelling'

  function setField<K extends keyof typeof emptyQA>(key: K, value: (typeof emptyQA)[K]) {
    setQA((prev) => ({ ...prev, [key]: value }))
  }

  function addTemporalValue() {
    setQA((prev) => ({ ...prev, temporalValues: [...prev.temporalValues, ''] }))
  }

  function updateTemporalValue(index: number, value: string) {
    setQA((prev) => {
      const updated = [...prev.temporalValues]
      updated[index] = value
      return { ...prev, temporalValues: updated }
    })
  }

  function removeTemporalValue(index: number) {
    setQA((prev) => ({
      ...prev,
      temporalValues: prev.temporalValues.filter((_, i) => i !== index),
    }))
  }

  async function handleClaim() {
    if (isBusy || isModalVisible) return
    setState('starting')
    setError(null)

    const result = await startTaskAction(taskId)
    if (result.error) {
      setError(result.error)
      setState('idle')
      return
    }

    window.open(`https://feather.openai.com/tasks/${externalId}`, '_blank')
    setState('open')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('submitting')
    setError(null)

    const result = await finishTaskAction(taskId, {
      original_question: qa.originalQuestion,
      original_answer: qa.originalAnswer,
      is_question_valid: qa.isQuestionValid,
      question_invalid_reason: qa.questionInvalidReason || null,
      new_question: qa.newQuestion || null,
      is_answer_valid: qa.isAnswerValid,
      answer_invalid_reason: qa.answerInvalidReason || null,
      new_answer: qa.newAnswer || null,
      is_temporal: qa.isTemporal,
      temporal_values: qa.temporalValues.filter(Boolean),
    })

    if (result.error) {
      setError(result.error)
      setState('open')
      return
    }

    setState('idle')
    setQA(emptyQA)
    onSubmitted?.()
    toast.success('Task submitted!', {
      description: `Task ${externalId} has been submitted for review. Great work!`,
      duration: 6000,
    })
  }

  async function handleCancel() {
    setState('cancelling')
    setError(null)

    const result = await cancelTaskAction(taskId)
    if (result.error) {
      setError(result.error)
      setState('open')
      return
    }

    setState('idle')
    setQA(emptyQA)
  }

  const modal = isModalVisible
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <PrismStripes
              variant="horizontal"
              thickness={6}
              className="absolute top-0 left-0 right-0 z-20 opacity-70"
            />

            {/* Header */}
            <div className="relative z-10 px-6 pt-8 pb-4 shrink-0">
              <h2 className="text-lg font-semibold text-primary">Submit Task</h2>
              <p className="text-sm text-muted mt-1">
                Complete your work on{' '}
                <a
                  href={`https://feather.openai.com/tasks/${externalId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Feather
                </a>
                , then fill in the details below.
              </p>
            </div>

            {/* Scrollable form body */}
            <form
              onSubmit={handleSubmit}
              className="relative z-10 flex flex-col gap-5 overflow-y-auto px-6 pb-6"
            >
              {/* Original content */}
              <Field label="Original Question">
                <TextArea
                  value={qa.originalQuestion}
                  onChange={(v) => setField('originalQuestion', v)}
                  placeholder="Paste the original question…"
                />
              </Field>

              <Field label="Original Answer">
                <TextArea
                  value={qa.originalAnswer}
                  onChange={(v) => setField('originalAnswer', v)}
                  placeholder="Paste the original answer…"
                />
              </Field>

              <hr className="border-border" />

              {/* Question validity */}
              <Field label="Is the question valid?">
                <YesNoToggle
                  value={qa.isQuestionValid}
                  onChange={(v) => setField('isQuestionValid', v)}
                />
              </Field>

              {qa.isQuestionValid === false && (
                <>
                  <Field label="Why is the question not valid?">
                    <TextArea
                      value={qa.questionInvalidReason}
                      onChange={(v) => setField('questionInvalidReason', v)}
                      placeholder="Explain why…"
                    />
                  </Field>
                  <Field label="New question">
                    <TextArea
                      value={qa.newQuestion}
                      onChange={(v) => setField('newQuestion', v)}
                      placeholder="Write a corrected question…"
                    />
                  </Field>
                </>
              )}

              <hr className="border-border" />

              {/* Answer validity */}
              <Field label="Is the answer valid?">
                <YesNoToggle
                  value={qa.isAnswerValid}
                  onChange={(v) => setField('isAnswerValid', v)}
                />
              </Field>

              {qa.isAnswerValid === false && (
                <>
                  <Field label="Why is the answer not valid?">
                    <TextArea
                      value={qa.answerInvalidReason}
                      onChange={(v) => setField('answerInvalidReason', v)}
                      placeholder="Explain why…"
                    />
                  </Field>
                  <Field label="New answer">
                    <TextArea
                      value={qa.newAnswer}
                      onChange={(v) => setField('newAnswer', v)}
                      placeholder="Write a corrected answer…"
                    />
                  </Field>
                </>
              )}

              <hr className="border-border" />

              {/* Temporal */}
              <Field label="Is this a temporal question?">
                <YesNoToggle
                  value={qa.isTemporal}
                  onChange={(v) => setField('isTemporal', v)}
                />
              </Field>

              {qa.isTemporal === true && (
                <Field label="Temporal values">
                  <div className="flex flex-col gap-2">
                    {qa.temporalValues.map((val, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => updateTemporalValue(i, e.target.value)}
                          placeholder={`Value ${i + 1}…`}
                          className="flex-1 rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-primary outline-none focus:border-accent placeholder:text-muted"
                        />
                        <button
                          type="button"
                          onClick={() => removeTemporalValue(i)}
                          className="text-muted hover:text-red-400 text-sm px-1 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTemporalValue}
                      className="self-start text-xs text-accent hover:underline mt-1"
                    >
                      + Add value
                    </button>
                  </div>
                </Field>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent/20 border border-accent/50 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {state === 'submitting' ? <><Spinner /> Submitting…</> : 'Submit Task'}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted hover:text-primary hover:border-border/80 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {state === 'cancelling' ? <><Spinner /> Cancelling…</> : 'Cancel Task'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button
        type="button"
        disabled={isBusy || isModalVisible}
        onClick={handleClaim}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-hover border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/10 hover:border-accent/50 hover:text-white transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(52,67,218,0.15)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {state === 'starting' ? (
          <><Spinner /> Starting…</>
        ) : isModalVisible ? (
          'Working on task…'
        ) : (
          'Claim Task \u2192'
        )}
      </button>

      {error && !isModalVisible && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {modal}
    </>
  )
}
