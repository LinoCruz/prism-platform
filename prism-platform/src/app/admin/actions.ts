'use server'

import { revalidatePath } from 'next/cache'
import {
  updateUserRole,
  updateUserStatus,
  uploadTaskDataset,
  getTasksPaginated,
  getActiveTrainers,
  assignTasksToExpert,
  assignTasksToMultipleExperts,
  unassignTasks,
  autoDistributeTasks,
  getAdminTaskDetails,
  adminDisclaimTask,
  adminReassignTask,
  type UserStatus,
  type TaskStatusFilter,
} from '@/services/admin'
import { createInstruction, updateInstruction, deleteInstruction } from '@/services/instructions'
import { createCourse, updateCourse, deleteCourse, addTrainingRequirement, removeTrainingRequirement, createModule, updateModule, deleteModule } from '@/services/training'
import type { Database } from '@/types/database.types'

type Role = Database['public']['Enums']['user_role']

// ─── CSV helpers ────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''))
  const rows: Array<Record<string, string>> = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const values = parseCSVLine(lines[i])
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => { obj[h] = values[idx]?.replace(/"/g, '') ?? '' })
    rows.push(obj)
  }
  return rows
}

// ─── User management ────────────────────────────────────────────────────────

export async function submitStatusChange(formData: FormData) {
  const userId = formData.get('userId') as string
  const status = formData.get('status') as UserStatus
  if (!userId || !status) return
  await updateUserStatus(userId, status)
  revalidatePath('/admin')
}

export async function submitRoleChange(formData: FormData) {
  const userId = formData.get('userId') as string
  const role = formData.get('role') as Role
  if (!userId || !role) return
  await updateUserRole(userId, role)
  revalidatePath('/admin')
}

// ─── Dataset upload ──────────────────────────────────────────────────────────

export async function submitDataset(formData: FormData) {
  const file = formData.get('dataset') as File
  const batchId = (formData.get('batchId') as string)?.trim()
  if (!file) return
  if (!batchId) throw new Error('Batch ID is required')

  const text = await file.text()
  const isCSV = file.name.toLowerCase().endsWith('.csv')

  let items: Array<Record<string, any>>

  if (isCSV) {
    items = parseCSV(text)
  } else {
    const json = JSON.parse(text)
    if (!Array.isArray(json)) throw new Error('Dataset must be a JSON array')
    items = json
  }

  const formatted = items
    .map((item: any) => ({
      external_id: (item.task_id ?? item.id ?? item.external_id)?.toString(),
      question: (item.question ?? item.text)?.toString(),
    }))
    .filter(i => i.external_id && i.question)

  if (formatted.length === 0) throw new Error('No valid tasks found in dataset')

  await uploadTaskDataset(formatted, batchId)
  revalidatePath('/admin')
}

// ─── Task management ─────────────────────────────────────────────────────────

export async function fetchTasksPage({
  page,
  pageSize,
  search,
  statusFilter,
  questionSearch,
  taskIdSearch,
  attemptIdSearch,
  expertEmailSearch,
}: {
  page: number
  pageSize: number
  search: string
  statusFilter: TaskStatusFilter
  questionSearch?: string
  taskIdSearch?: string
  attemptIdSearch?: string
  expertEmailSearch?: string
}) {
  return getTasksPaginated({ page, pageSize, search, statusFilter, questionSearch, taskIdSearch, attemptIdSearch, expertEmailSearch })
}

export async function fetchTaskDetails(taskId: string) {
  return getAdminTaskDetails(taskId)
}

export async function fetchActiveTrainers() {
  return getActiveTrainers()
}

export async function submitAutoDistribute() {
  const result = await autoDistributeTasks()
  revalidatePath('/admin')
  return result
}

export async function submitTaskAssignment(formData: FormData) {
  const expertIdsStr = (formData.get('expertIds') as string) ?? ''
  const expertIds = expertIdsStr.split(',').filter(Boolean)
  const count = parseInt(formData.get('count') as string) || 0
  const taskIdsStr = (formData.get('taskIds') as string) ?? ''
  const taskIds = taskIdsStr.split(',').filter(Boolean)
  const weightsStr = (formData.get('weights') as string) ?? ''
  const weights = weightsStr ? (JSON.parse(weightsStr) as Record<string, number>) : undefined

  if (expertIds.length === 0) throw new Error('At least one expert required')

  const result = expertIds.length === 1 && !weights
    ? await assignTasksToExpert({
        expertId: expertIds[0],
        count: count > 0 ? count : undefined,
        taskIds: taskIds.length > 0 ? taskIds : undefined,
      })
    : await assignTasksToMultipleExperts({
        expertIds,
        count: count > 0 ? count : undefined,
        taskIds: taskIds.length > 0 ? taskIds : undefined,
        weights,
      })

  revalidatePath('/admin')
  return result
}

export async function submitDisclaimTask(taskId: string): Promise<{ error?: string }> {
  try {
    await adminDisclaimTask(taskId)
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to disclaim task' }
  }
}

export async function submitReassignTask(taskId: string, newExpertId: string): Promise<{ error?: string }> {
  try {
    await adminReassignTask(taskId, newExpertId)
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to reassign task' }
  }
}

export async function submitTaskUnassignment(formData: FormData) {
  const taskIdsStr = (formData.get('taskIds') as string) ?? ''
  const taskIds = taskIdsStr.split(',').filter(Boolean)
  if (taskIds.length === 0) throw new Error('No task IDs provided')
  const result = await unassignTasks(taskIds)
  revalidatePath('/admin')
  return result
}

// ─── Instructions ────────────────────────────────────────────────────────────

export async function submitCreateInstruction(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target_role = formData.get('target_role') as Role
  const display_order = parseInt(formData.get('display_order') as string) || 0
  const mediaRaw = formData.get('media') as string | null
  const media = mediaRaw ? JSON.parse(mediaRaw) : []
  if (!title || !content || !target_role) return
  await createInstruction({ title, content, target_role, display_order, media })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitUpdateInstruction(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const target_role = formData.get('target_role') as Role
  const display_order = parseInt(formData.get('display_order') as string) || 0
  const published = formData.get('published') === 'true'
  const mediaRaw = formData.get('media') as string | null
  const media = mediaRaw ? JSON.parse(mediaRaw) : undefined
  if (!instructionId) return
  await updateInstruction(instructionId, { title, content, target_role, display_order, published, ...(media !== undefined && { media }) })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitDeleteInstruction(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  if (!instructionId) return
  await deleteInstruction(instructionId)
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export async function submitCreateCourse(formData: FormData) {
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || undefined
  if (!title) return
  await createCourse({ title, description })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitUpdateCourse(formData: FormData) {
  const courseId = formData.get('courseId') as string
  const title = formData.get('title') as string
  const description = (formData.get('description') as string) || undefined
  if (!courseId) return
  await updateCourse(courseId, { title, description })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitDeleteCourse(formData: FormData) {
  const courseId = formData.get('courseId') as string
  if (!courseId) return
  await deleteCourse(courseId)
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitAddRequirement(formData: FormData) {
  const courseId = formData.get('courseId') as string
  const role_required = formData.get('role_required') as Role
  const mandatory = formData.get('mandatory') === 'true'
  if (!courseId || !role_required) return
  await addTrainingRequirement({ course_id: courseId, role_required, mandatory })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitRemoveRequirement(formData: FormData) {
  const requirementId = formData.get('requirementId') as string
  if (!requirementId) return
  await removeTrainingRequirement(requirementId)
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

// ─── Course Modules ───────────────────────────────────────────────────────────

export async function submitCreateModule(formData: FormData) {
  const course_id = formData.get('courseId') as string
  const title = formData.get('title') as string
  const video_url = (formData.get('video_url') as string) || undefined
  const module_order = parseInt(formData.get('module_order') as string) || 0
  if (!course_id || !title) return
  await createModule({ course_id, title, video_url, module_order })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitUpdateModule(formData: FormData) {
  const moduleId = formData.get('moduleId') as string
  const title = formData.get('title') as string
  const video_url = (formData.get('video_url') as string) || null
  if (!moduleId) return
  await updateModule(moduleId, { title, video_url })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitDeleteModule(formData: FormData) {
  const moduleId = formData.get('moduleId') as string
  if (!moduleId) return
  await deleteModule(moduleId)
  revalidatePath('/admin')
  revalidatePath('/instructions')
}

export async function submitTogglePublished(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  const published = formData.get('published') === 'true'
  if (!instructionId) return
  await updateInstruction(instructionId, { published })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}
