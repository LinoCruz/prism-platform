'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  submitCreateInstruction,
  submitUpdateInstruction,
  submitDeleteInstruction,
  submitTogglePublished,
} from './actions'
import type { Instruction } from '@/services/instructions'

const ROLES = ['trainee', 'trainer', 'reviewer', 'auditor'] as const
type TargetRole = typeof ROLES[number]

const ROLE_LABELS: Record<TargetRole, string> = {
  trainee:  'General (All)',
  trainer:  'Trainer',
  reviewer: 'Reviewer',
  auditor:  'Auditor',
}

type EditState = { mode: 'create' } | { mode: 'edit'; doc: Instruction } | null

export function InstructionsPanel({ instructions }: { instructions: Instruction[] }) {
  const [editState, setEditState] = useState<EditState>(null)
  const [filterRole, setFilterRole] = useState<TargetRole | 'all'>('all')
  const [isPending, startTransition] = useTransition()

  const visible = filterRole === 'all'
    ? instructions
    : instructions.filter((i) => i.target_role === filterRole)

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await submitCreateInstruction(formData)
      toast.success('Instruction created')
      setEditState(null)
    })
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await submitUpdateInstruction(formData)
      toast.success('Instruction updated')
      setEditState(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this instruction? This cannot be undone.')) return
    const fd = new FormData()
    fd.set('instructionId', id)
    startTransition(async () => {
      await submitDeleteInstruction(fd)
      toast.success('Instruction deleted')
    })
  }

  function handleTogglePublish(id: string, current: boolean) {
    const fd = new FormData()
    fd.set('instructionId', id)
    fd.set('published', String(!current))
    startTransition(async () => {
      await submitTogglePublished(fd)
      toast.success(!current ? 'Published' : 'Unpublished')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', ...ROLES] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                filterRole === r
                  ? 'bg-orange-500/20 border-orange-400/60 text-orange-300'
                  : 'border-white/20 text-white/50 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              {r === 'all' ? 'All' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditState({ mode: 'create' })}
          className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 text-sm font-medium transition-all"
        >
          + New Instruction
        </button>
      </div>

      {/* Create / Edit form */}
      {editState && (
        <InstructionForm
          key={editState.mode === 'edit' ? editState.doc.instruction_id : 'new'}
          initial={editState.mode === 'edit' ? editState.doc : undefined}
          onSubmit={editState.mode === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setEditState(null)}
          isPending={isPending}
        />
      )}

      {/* List */}
      {visible.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No instructions found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((doc) => (
            <div
              key={doc.instruction_id}
              className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{doc.title}</span>
                    <span className="text-xs rounded-full border border-white/15 px-2 py-0.5 text-white/50">
                      {ROLE_LABELS[doc.target_role as TargetRole] ?? doc.target_role}
                    </span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        doc.published
                          ? 'bg-green-500/15 text-green-400 border border-green-400/30'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }`}
                    >
                      {doc.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-muted line-clamp-2 whitespace-pre-wrap">
                    {doc.content}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleTogglePublish(doc.instruction_id, doc.published)}
                    disabled={isPending}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:text-white/90 hover:border-white/40 transition-all disabled:opacity-40"
                  >
                    {doc.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => setEditState({ mode: 'edit', doc })}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:text-orange-300 hover:border-orange-400/30 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(doc.instruction_id)}
                    disabled={isPending}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:text-red-400 hover:border-red-400/30 transition-all disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InstructionForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: Instruction
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <form
      action={onSubmit}
      className="rounded-2xl border border-orange-400/20 bg-orange-500/5 p-6 flex flex-col gap-4"
    >
      {initial && (
        <input type="hidden" name="instructionId" value={initial.instruction_id} />
      )}
      {initial && (
        <input type="hidden" name="published" value={String(initial.published)} />
      )}

      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-secondary font-medium">Title</label>
          <input
            name="title"
            defaultValue={initial?.title ?? ''}
            required
            placeholder="e.g. How to complete a task"
            className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60 placeholder:text-white/20"
          />
        </div>
        <div className="flex flex-col gap-1 w-40">
          <label className="text-xs text-secondary font-medium">Audience</label>
          <select
            name="target_role"
            defaultValue={initial?.target_role ?? 'trainer'}
            className="rounded-lg bg-surface border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-24">
          <label className="text-xs text-secondary font-medium">Order</label>
          <input
            name="display_order"
            type="number"
            defaultValue={initial?.display_order ?? 0}
            className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-secondary font-medium">Content</label>
        <textarea
          name="content"
          defaultValue={initial?.content ?? ''}
          required
          rows={10}
          placeholder="Write your instructions here. Markdown-style formatting is preserved."
          className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400/60 resize-y placeholder:text-white/20"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-secondary hover:text-foreground transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-5 py-1.5 text-sm font-medium transition-all disabled:opacity-50"
        >
          {isPending ? 'Saving…' : initial ? 'Save Changes' : 'Create'}
        </button>
      </div>
    </form>
  )
}
