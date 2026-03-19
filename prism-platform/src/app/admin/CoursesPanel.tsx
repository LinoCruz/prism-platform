'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  submitCreateCourse,
  submitUpdateCourse,
  submitDeleteCourse,
  submitAddRequirement,
  submitRemoveRequirement,
  submitCreateModule,
  submitUpdateModule,
  submitDeleteModule,
} from './actions'
import { MediaUploader } from '@/components/MediaUploader'
import type { MediaItem } from '@/types/media'

const ROLES = ['trainee', 'trainer', 'reviewer', 'auditor', 'admin'] as const
type UserRole = typeof ROLES[number]

const ROLE_LABELS: Record<UserRole, string> = {
  trainee:  'General (All)',
  trainer:  'Trainer',
  reviewer: 'Reviewer',
  auditor:  'Auditor',
  admin:    'Admin',
}

export type CourseModule = {
  module_id: string
  course_id: string
  title: string
  video_url: string | null
  module_order: number
  created_at: string
}

export type CourseWithRequirements = {
  course_id: string
  title: string
  description: string | null
  created_at: string
  training_requirements: {
    requirement_id: string
    role_required: string
    mandatory: boolean
  }[]
  course_modules: CourseModule[]
}

type EditState = { mode: 'create' } | { mode: 'edit'; course: CourseWithRequirements } | null
type ModuleEditState = { mode: 'create'; courseId: string } | { mode: 'edit'; module: CourseModule } | null

export function CoursesPanel({ courses }: { courses: CourseWithRequirements[] }) {
  const [editState, setEditState] = useState<EditState>(null)
  const [moduleEditState, setModuleEditState] = useState<ModuleEditState>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await submitCreateCourse(formData)
      toast.success('Course created')
      setEditState(null)
    })
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      await submitUpdateCourse(formData)
      toast.success('Course updated')
      setEditState(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this course? This cannot be undone.')) return
    const fd = new FormData()
    fd.set('courseId', id)
    startTransition(async () => {
      await submitDeleteCourse(fd)
      toast.success('Course deleted')
    })
  }

  function handleAddRequirement(courseId: string, role: UserRole, mandatory: boolean) {
    const fd = new FormData()
    fd.set('courseId', courseId)
    fd.set('role_required', role)
    fd.set('mandatory', String(mandatory))
    startTransition(async () => {
      await submitAddRequirement(fd)
      toast.success('Role requirement added')
    })
  }

  function handleCreateModule(formData: FormData) {
    startTransition(async () => {
      await submitCreateModule(formData)
      toast.success('Module added')
      setModuleEditState(null)
    })
  }

  function handleUpdateModule(formData: FormData) {
    startTransition(async () => {
      await submitUpdateModule(formData)
      toast.success('Module updated')
      setModuleEditState(null)
    })
  }

  function handleDeleteModule(moduleId: string) {
    if (!confirm('Delete this module?')) return
    const fd = new FormData()
    fd.set('moduleId', moduleId)
    startTransition(async () => {
      await submitDeleteModule(fd)
      toast.success('Module deleted')
    })
  }

  function handleRemoveRequirement(requirementId: string) {
    const fd = new FormData()
    fd.set('requirementId', requirementId)
    startTransition(async () => {
      await submitRemoveRequirement(fd)
      toast.success('Role requirement removed')
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-secondary">
          {courses.length} course{courses.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setEditState({ mode: 'create' })}
          className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 text-sm font-medium transition-all"
        >
          + New Course
        </button>
      </div>

      {editState && (
        <CourseForm
          key={editState.mode === 'edit' ? editState.course.course_id : 'new'}
          initial={editState.mode === 'edit' ? editState.course : undefined}
          onSubmit={editState.mode === 'create' ? handleCreate : handleUpdate}
          onCancel={() => setEditState(null)}
          isPending={isPending}
        />
      )}

      {courses.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">No courses yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {courses.map((course) => {
            const assignedRoles = new Set(course.training_requirements.map((r) => r.role_required))
            const availableRoles = ROLES.filter((r) => !assignedRoles.has(r))

            return (
              <div
                key={course.course_id}
                className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-medium text-sm">{course.title}</span>
                    {course.description && (
                      <p className="text-xs text-muted line-clamp-2">{course.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEditState({ mode: 'edit', course })}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:text-orange-300 hover:border-orange-400/30 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.course_id)}
                      disabled={isPending}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/60 hover:text-red-400 hover:border-red-400/30 transition-all disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Modules */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-secondary font-medium uppercase tracking-widest">Modules</p>
                    <button
                      onClick={() => setModuleEditState({ mode: 'create', courseId: course.course_id })}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      + Add module
                    </button>
                  </div>

                  {moduleEditState?.mode === 'create' && (moduleEditState as { mode: 'create'; courseId: string }).courseId === course.course_id && (
                    <ModuleForm
                      courseId={course.course_id}
                      nextOrder={course.course_modules.length}
                      onSubmit={handleCreateModule}
                      onCancel={() => setModuleEditState(null)}
                      isPending={isPending}
                    />
                  )}

                  {course.course_modules.length === 0 && (moduleEditState as { mode: 'create'; courseId: string } | null)?.courseId !== course.course_id && (
                    <p className="text-xs text-muted">No modules yet.</p>
                  )}

                  <div className="flex flex-col gap-2">
                    {course.course_modules.map((mod) => (
                      <div key={mod.module_id}>
                        {moduleEditState?.mode === 'edit' && moduleEditState.module.module_id === mod.module_id ? (
                          <ModuleForm
                            courseId={course.course_id}
                            initial={mod}
                            nextOrder={mod.module_order}
                            onSubmit={handleUpdateModule}
                            onCancel={() => setModuleEditState(null)}
                            isPending={isPending}
                          />
                        ) : (
                          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/3 px-3 py-2">
                            <span className="text-xs text-secondary w-4 shrink-0">{mod.module_order + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{mod.title}</p>
                              {mod.video_url && (
                                <a
                                  href={mod.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors truncate block"
                                >
                                  {mod.video_url.startsWith('http') ? 'Video attached' : mod.video_url}
                                </a>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => setModuleEditState({ mode: 'edit', module: mod })}
                                className="text-[10px] text-white/40 hover:text-orange-300 transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-orange-400/20"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteModule(mod.module_id)}
                                disabled={isPending}
                                className="text-[10px] text-white/40 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/20 disabled:opacity-40"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Role requirements */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-secondary font-medium uppercase tracking-widest">Assigned roles</p>
                  <div className="flex flex-wrap gap-2">
                    {course.training_requirements.length === 0 && (
                      <span className="text-xs text-muted">None</span>
                    )}
                    {course.training_requirements.map((req) => (
                      <span
                        key={req.requirement_id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        {ROLE_LABELS[req.role_required as UserRole] ?? req.role_required}
                        {req.mandatory && (
                          <span className="text-orange-400 font-medium">·&nbsp;Required</span>
                        )}
                        <button
                          onClick={() => handleRemoveRequirement(req.requirement_id)}
                          disabled={isPending}
                          className="text-white/30 hover:text-red-400 transition-colors disabled:opacity-40 ml-0.5"
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {availableRoles.length > 0 && (
                      <AddRoleDropdown
                        roles={availableRoles}
                        onAdd={(role, mandatory) => handleAddRequirement(course.course_id, role, mandatory)}
                        disabled={isPending}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddRoleDropdown({
  roles,
  onAdd,
  disabled,
}: {
  roles: readonly UserRole[]
  onAdd: (role: UserRole, mandatory: boolean) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mandatory, setMandatory] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-white/40 hover:text-white/70 hover:border-white/40 transition-all disabled:opacity-40"
      >
        + Add role
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-52 rounded-xl border border-white/15 bg-surface shadow-xl p-2 flex flex-col gap-1">
          <label className="flex items-center gap-2 px-2 py-1 text-xs text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
              className="accent-orange-500"
            />
            Mark as required
          </label>
          <div className="border-t border-white/10 my-1" />
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => { onAdd(role, mandatory); setOpen(false) }}
              className="text-left rounded-lg px-2 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ModuleForm({
  courseId,
  initial,
  nextOrder,
  onSubmit,
  onCancel,
  isPending,
}: {
  courseId: string
  initial?: CourseModule
  nextOrder: number
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [videoItem, setVideoItem] = useState<MediaItem[]>(
    initial?.video_url ? [{ url: initial.video_url, type: 'video', name: 'video' }] : []
  )

  return (
    <form
      action={(fd) => {
        if (videoItem.length > 0) fd.set('video_url', videoItem[0].url)
        onSubmit(fd)
      }}
      className="rounded-xl border border-orange-400/20 bg-orange-500/5 p-4 flex flex-col gap-3"
    >
      {initial && <input type="hidden" name="moduleId" value={initial.module_id} />}
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="module_order" value={nextOrder} />

      <div className="flex flex-col gap-1">
        <label className="text-xs text-secondary font-medium">Module title</label>
        <input
          name="title"
          defaultValue={initial?.title ?? ''}
          required
          placeholder="e.g. Introduction"
          className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60 placeholder:text-white/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-secondary font-medium">Video</label>
        <MediaUploader
          items={videoItem}
          onChange={(items) => setVideoItem(items.slice(-1))}
          disabled={isPending}
        />
        {videoItem.length === 0 && (
          <input
            name="video_url"
            placeholder="Or paste a video URL"
            defaultValue={initial?.video_url ?? ''}
            className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60 placeholder:text-white/20"
          />
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-white/20 px-3 py-1 text-xs text-secondary hover:text-foreground transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-1 text-xs font-medium transition-all disabled:opacity-50"
        >
          {isPending ? 'Saving…' : initial ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  )
}

function CourseForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: CourseWithRequirements
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <form
      action={onSubmit}
      className="rounded-2xl border border-orange-400/20 bg-orange-500/5 p-6 flex flex-col gap-4"
    >
      {initial && <input type="hidden" name="courseId" value={initial.course_id} />}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-secondary font-medium">Title</label>
        <input
          name="title"
          defaultValue={initial?.title ?? ''}
          required
          placeholder="e.g. General Project Guidelines"
          className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60 placeholder:text-white/20"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-secondary font-medium">Description</label>
        <textarea
          name="description"
          defaultValue={initial?.description ?? ''}
          rows={3}
          placeholder="Brief summary of what this course covers."
          className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:border-orange-400/60 resize-y placeholder:text-white/20"
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
