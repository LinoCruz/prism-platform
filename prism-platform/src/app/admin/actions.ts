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
  type UserStatus,
  type TaskStatusFilter,
} from '@/services/admin'
import { createInstruction, updateInstruction, deleteInstruction } from '@/services/instructions'
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
}: {
  page: number
  pageSize: number
  search: string
  statusFilter: TaskStatusFilter
  questionSearch?: string
}) {
  return getTasksPaginated({ page, pageSize, search, statusFilter, questionSearch })
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
  if (!title || !content || !target_role) return
  await createInstruction({ title, content, target_role, display_order })
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
  if (!instructionId) return
  await updateInstruction(instructionId, { title, content, target_role, display_order, published })
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

export async function submitTogglePublished(formData: FormData) {
  const instructionId = formData.get('instructionId') as string
  const published = formData.get('published') === 'true'
  if (!instructionId) return
  await updateInstruction(instructionId, { published })
  revalidatePath('/admin')
  revalidatePath('/instructions')
}
