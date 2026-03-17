import { createClient } from '@/lib/supabase/server'
import { getCurrentUserRoles } from './users'
import type { Database } from '@/types/database.types'

type Role = Database['public']['Enums']['user_role']

export async function checkAdmin() {
  const roles = await getCurrentUserRoles()
  if (!roles.includes('admin')) {
    throw new Error('Unauthorized')
  }
}

export type TaskStatusFilter = 'all' | 'free' | 'assigned'

export type AdminTask = {
  task_id: string
  external_id: string
  question: string
  status: string
  reserved_for_id: string | null
  reserved_for_name: string | null
  created_at: string
}

export async function getTasksPaginated({
  page = 0,
  pageSize = 20,
  search = '',
  statusFilter = 'all',
}: {
  page?: number
  pageSize?: number
  search?: string
  statusFilter?: TaskStatusFilter
}) {
  await checkAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('tasks')
    .select('task_id, external_id, question, status, reserved_for_id, created_at', { count: 'exact' })

  if (search) {
    query = query.ilike('external_id', `%${search}%`)
  }

  if (statusFilter === 'free') {
    query = query.eq('status', 'available').is('reserved_for_id', null)
  } else if (statusFilter === 'assigned') {
    query = query.or('status.eq.reserved,status.eq.claimed,status.eq.in_review,status.eq.rework,status.eq.signed_off')
  }

  const { data: tasks, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error

  // Resolve display names for reserved tasks
  const reservedIds = [...new Set((tasks ?? []).filter(t => t.reserved_for_id).map(t => t.reserved_for_id!))]
  let userMap: Record<string, string> = {}
  if (reservedIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('user_id, display_name')
      .in('user_id', reservedIds)
    if (users) users.forEach(u => { userMap[u.user_id] = u.display_name })
  }

  return {
    tasks: (tasks ?? []).map(t => ({
      ...t,
      reserved_for_name: t.reserved_for_id ? (userMap[t.reserved_for_id] ?? null) : null,
    })) as AdminTask[],
    total: count ?? 0,
  }
}

export async function getActiveTrainers() {
  await checkAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('user_id, display_name, email')
    .in('role', ['trainee', 'trainer'])
    .not('status', 'eq', 'disabled')
    .order('display_name')

  if (error) throw error
  return (data ?? []) as { user_id: string; display_name: string; email: string }[]
}

export async function assignTasksToExpert({
  expertId,
  count,
  taskIds,
}: {
  expertId: string
  count?: number
  taskIds?: string[]
}) {
  await checkAdmin()
  const supabase = await createClient()

  let targetIds: string[]

  if (taskIds && taskIds.length > 0) {
    targetIds = taskIds
  } else if (count && count > 0) {
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id')
      .eq('status', 'available')
      .is('reserved_for_id', null)
      .limit(count)
    if (error) throw error
    targetIds = (data ?? []).map(t => t.task_id)
  } else {
    throw new Error('Provide either taskIds or a count')
  }

  if (targetIds.length === 0) return { assigned: 0 }

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'reserved' as const, reserved_for_id: expertId })
    .in('task_id', targetIds)
    .eq('status', 'available')

  if (error) throw error
  return { assigned: targetIds.length }
}

export async function getAllUsersWithRoles() {
  await checkAdmin()
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return users
}

export type UserStatus = 'onboarding' | 'pending_entry_quiz' | 'training' | 'active' | 'disabled'

export async function updateUserStatus(userId: string, status: UserStatus) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    throw new Error('Admins cannot change their own status')
  }

  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('user_id', userId)
  if (error) throw error
}

export async function updateUserRole(userId: string, role: Role) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.id === userId) {
    throw new Error('Admins cannot change their own role')
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('user_id', userId)
  if (error) throw error
}

export async function uploadTaskDataset(tasks: { external_id: string, question: string }[]) {
  await checkAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .upsert(
      tasks.map(t => ({
        external_id: t.external_id,
        question: t.question,
        status: 'available' as const
      })),
      { onConflict: 'external_id' }
    )

  if (error) throw error
  return data
}
