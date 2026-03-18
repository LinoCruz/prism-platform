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

export function ClaimTaskButton({ taskId, externalId, onSubmitted }: Props) {
  const [state, setState] = useState<ModalState>('idle')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isBusy = state === 'starting' || state === 'submitting' || state === 'cancelling'
  const isModalVisible = state === 'open' || state === 'submitting' || state === 'cancelling'

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

    const result = await finishTaskAction(taskId)
    if (result.error) {
      setError(result.error)
      setState('open')
      return
    }

    setState('idle')
    setNotes('')
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
    setNotes('')
  }

  const modal = isModalVisible
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden">
            <PrismStripes
              variant="horizontal"
              thickness={6}
              className="absolute top-0 left-0 right-0 z-20 opacity-70"
            />

            <div className="relative z-10 p-6 pt-8">
              {/* Header */}
              <div className="mb-5">
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
                  , then submit below to mark this task as done.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-secondary mb-1.5">
                    Completion Notes{' '}
                    <span className="text-muted">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Any notes about your work on this task…"
                    className="w-full rounded-xl border border-border bg-surface/50 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent placeholder:text-muted resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}

                <div className="flex gap-3">
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
