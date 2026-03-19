'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  submitCreateInstruction,
  submitUpdateInstruction,
  submitDeleteInstruction,
  submitTogglePublished,
} from './actions'
import type { Instruction, MediaItem } from '@/services/instructions'
import { MediaUploader } from '@/components/MediaUploader'
import { RichTextEditor } from '@/components/RichTextEditor'

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
  const [previewDoc, setPreviewDoc] = useState<Instruction | null>(null)
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
                    onClick={() => setPreviewDoc(doc)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:text-white/90 hover:border-white/40 transition-all"
                  >
                    Preview
                  </button>
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

      {/* Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-surface border border-white/12 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-white/50 hover:text-white hover:bg-white/15 transition-all text-lg"
            >
              ×
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs rounded-full border border-white/15 px-2 py-0.5 text-white/50">
                {ROLE_LABELS[previewDoc.target_role as TargetRole] ?? previewDoc.target_role}
              </span>
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                previewDoc.published
                  ? 'bg-green-500/15 text-green-400 border border-green-400/30'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}>
                {previewDoc.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-6 mt-2">{previewDoc.title}</h2>
            <div
              className="text-secondary text-sm leading-relaxed rich-content"
              dangerouslySetInnerHTML={
                previewDoc.content.trimStart().startsWith('<')
                  ? { __html: previewDoc.content }
                  : undefined
              }
            >
              {previewDoc.content.trimStart().startsWith('<') ? undefined : previewDoc.content}
            </div>
            {Array.isArray(previewDoc.media) && (previewDoc.media as MediaItem[]).length > 0 && (
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-xs font-medium uppercase tracking-widest text-secondary">Attachments</p>
                <div className="flex flex-wrap gap-3">
                  {(previewDoc.media as MediaItem[]).map((item) => (
                    <div key={item.url} className="rounded-xl overflow-hidden border border-white/10">
                      {item.type === 'video' ? (
                        <video src={item.url} controls className="max-w-full max-h-52 rounded-xl" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt={item.name} className="max-w-full max-h-52 object-contain rounded-xl" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(
    Array.isArray(initial?.media) ? (initial.media as MediaItem[]) : []
  )
  const [content, setContent] = useState(initial?.content ?? '')

  return (
    <form
      action={(fd) => { fd.set('media', JSON.stringify(mediaItems)); fd.set('content', content); onSubmit(fd) }}
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
        <RichTextEditor
          value={content}
          onChange={setContent}
          disabled={isPending}
          placeholder="Write your instructions here…"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-secondary font-medium">Media attachments</label>
        <MediaUploader items={mediaItems} onChange={setMediaItems} disabled={isPending} />
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
