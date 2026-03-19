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
  reserved_for_email: string | null
  created_at: string
}

export async function getTasksPaginated({
  page = 0,
  pageSize = 20,
  search = '',
  statusFilter = 'all',
  questionSearch = '',
  taskIdSearch = '',
  attemptIdSearch = '',
  expertEmailSearch = '',
}: {
  page?: number
  pageSize?: number
  search?: string
  statusFilter?: TaskStatusFilter
  questionSearch?: string
  taskIdSearch?: string
  attemptIdSearch?: string
  expertEmailSearch?: string
}) {
  await checkAdmin()
  const supabase = await createClient()

  // Resolve attempt_id → task_ids before building main query
  let attemptTaskIds: string[] | null = null
  if (attemptIdSearch) {
    const { data: matchingAttempts } = await supabase
      .from('task_attempts')
      .select('task_id')
      .filter('attempt_id::text', 'ilike', `%${attemptIdSearch}%`)
    attemptTaskIds = [...new Set((matchingAttempts ?? []).map(a => a.task_id))]
    if (attemptTaskIds.length === 0) return { tasks: [], total: 0 }
  }

  // Resolve expert email → user_ids
  let expertUserIds: string[] | null = null
  if (expertEmailSearch) {
    const { data: matchingUsers } = await supabase
      .from('users')
      .select('user_id')
      .ilike('email', `%${expertEmailSearch}%`)
    expertUserIds = (matchingUsers ?? []).map(u => u.user_id)
    if (expertUserIds.length === 0) return { tasks: [], total: 0 }
  }

  let query = supabase
    .from('tasks')
    .select('task_id, external_id, question, status, reserved_for_id, created_at', { count: 'exact' })

  if (search) {
    query = query.ilike('external_id', `%${search}%`)
  }

  if (questionSearch) {
    query = query.ilike('question', `%${questionSearch}%`)
  }

  if (taskIdSearch) {
    query = query.filter('task_id::text', 'ilike', `%${taskIdSearch}%`)
  }

  if (attemptTaskIds) {
    query = query.in('task_id', attemptTaskIds)
  }

  if (expertUserIds) {
    query = query.in('reserved_for_id', expertUserIds)
  }

  if (statusFilter === 'free') {
    query = query.eq('status', 'available').is('reserved_for_id', null)
  } else if (statusFilter === 'assigned') {
    query = query.or('status.eq.reserved,status.eq.claimed,status.eq.completed,status.eq.in_review,status.eq.sent_for_rework,status.eq.fixed,status.eq.signed_off')
  }

  const { data: tasks, error, count } = await query
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error

  // Resolve emails for reserved tasks
  const reservedIds = [...new Set((tasks ?? []).filter(t => t.reserved_for_id).map(t => t.reserved_for_id!))]
  let userMap: Record<string, string> = {}
  if (reservedIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('user_id, email')
      .in('user_id', reservedIds)
    if (users) users.forEach(u => { userMap[u.user_id] = u.email })
  }

  return {
    tasks: (tasks ?? []).map(t => ({
      ...t,
      reserved_for_email: t.reserved_for_id ? (userMap[t.reserved_for_id] ?? null) : null,
    })) as AdminTask[],
    total: count ?? 0,
  }
}

export async function getActiveTrainers() {
  await checkAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('user_id, display_name, email, role')
    .in('role', ['trainee', 'trainer'])
    .not('status', 'eq', 'disabled')
    .order('display_name')

  if (error) throw error
  return (data ?? []) as { user_id: string; display_name: string; email: string; role: string }[]
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

export async function assignTasksToMultipleExperts({
  expertIds,
  count,
  taskIds,
  weights,
}: {
  expertIds: string[]
  count?: number
  taskIds?: string[]
  weights?: Record<string, number>
}) {
  await checkAdmin()
  const supabase = await createClient()

  if (expertIds.length === 0) throw new Error('At least one expert required')

  // Custom weights: specific count per expert, fetch pool once to avoid duplicates
  if (weights) {
    const totalNeeded = Object.values(weights).reduce((a, b) => a + b, 0)
    if (totalNeeded === 0) return { assigned: 0 }

    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('task_id')
      .eq('status', 'available')
      .is('reserved_for_id', null)
      .limit(totalNeeded)
    if (fetchError) throw fetchError

    const pool = (data ?? []).map(t => t.task_id)
    let cursor = 0
    let totalAssigned = 0

    for (const expertId of expertIds) {
      const expertCount = weights[expertId] ?? 0
      if (expertCount === 0) continue
      const ids = pool.slice(cursor, cursor + expertCount)
      cursor += expertCount
      if (ids.length === 0) break
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'reserved' as const, reserved_for_id: expertId })
        .in('task_id', ids)
        .eq('status', 'available')
      if (error) throw error
      totalAssigned += ids.length
    }

    return { assigned: totalAssigned }
  }

  let targetTaskIds: string[]

  if (taskIds && taskIds.length > 0) {
    targetTaskIds = taskIds
  } else if (count && count > 0) {
    const totalNeeded = count * expertIds.length
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id')
      .eq('status', 'available')
      .is('reserved_for_id', null)
      .limit(totalNeeded)
    if (error) throw error
    targetTaskIds = (data ?? []).map(t => t.task_id)
  } else {
    throw new Error('Provide either taskIds, a count, or weights')
  }

  if (targetTaskIds.length === 0) return { assigned: 0 }

  // Round-robin distribution across experts
  const byExpert: Record<string, string[]> = {}
  expertIds.forEach(id => { byExpert[id] = [] })
  targetTaskIds.forEach((taskId, i) => {
    byExpert[expertIds[i % expertIds.length]].push(taskId)
  })

  let totalAssigned = 0
  for (const [expertId, ids] of Object.entries(byExpert)) {
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'reserved' as const, reserved_for_id: expertId })
      .in('task_id', ids)
      .eq('status', 'available')
    if (error) throw error
    totalAssigned += ids.length
  }

  return { assigned: totalAssigned }
}

export async function unassignTasks(taskIds: string[]) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'available' as const, reserved_for_id: null })
    .in('task_id', taskIds)
    .eq('status', 'reserved')

  if (error) throw error
  return { unassigned: taskIds.length }
}

export async function autoDistributeTasks() {
  await checkAdmin()
  const supabase = await createClient()

  // Get all free tasks
  const { data: freeTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('task_id')
    .eq('status', 'available')
    .is('reserved_for_id', null)
  if (tasksError) throw tasksError
  if (!freeTasks || freeTasks.length === 0) throw new Error('No free tasks available to distribute')

  // Get experts without any reserved/active tasks
  const { data: allExperts, error: expertsError } = await supabase
    .from('users')
    .select('user_id')
    .in('role', ['trainee', 'trainer'])
    .not('status', 'eq', 'disabled')
  if (expertsError) throw expertsError
  if (!allExperts || allExperts.length === 0) throw new Error('No active experts found')

  // Find experts who already have reserved tasks
  const { data: assignedExperts } = await supabase
    .from('tasks')
    .select('reserved_for_id')
    .eq('status', 'reserved')
    .not('reserved_for_id', 'is', null)
  const assignedIds = new Set((assignedExperts ?? []).map(t => t.reserved_for_id!))
  const eligibleExperts = allExperts.filter(e => !assignedIds.has(e.user_id))

  if (eligibleExperts.length === 0) throw new Error('All experts already have assigned tasks')

  // Shuffle tasks for random distribution
  const shuffled = [...freeTasks].sort(() => Math.random() - 0.5)

  // Build update batches: distribute tasks round-robin across eligible experts
  const updates = shuffled.map((task, i) => ({
    task_id: task.task_id,
    expert_id: eligibleExperts[i % eligibleExperts.length].user_id,
  }))

  // Group updates by expert for bulk update
  const byExpert: Record<string, string[]> = {}
  for (const { task_id, expert_id } of updates) {
    if (!byExpert[expert_id]) byExpert[expert_id] = []
    byExpert[expert_id].push(task_id)
  }

  let totalAssigned = 0
  for (const [expertId, taskIds] of Object.entries(byExpert)) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'reserved' as const, reserved_for_id: expertId })
      .in('task_id', taskIds)
      .eq('status', 'available')
    if (error) throw error
    totalAssigned += taskIds.length
  }

  return { assigned: totalAssigned, experts: eligibleExperts.length }
}

export async function getAdminTaskDetails(taskId: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_id', taskId)
    .single()
  if (error) throw error

  const { data: attempts } = await supabase
    .from('task_attempts')
    .select('*')
    .eq('task_id', taskId)
    .order('attempt_number', { ascending: true })

  const { data: reviews } = await supabase
    .from('task_reviews')
    .select('*')
    .eq('task_id', taskId)
    .order('review_number', { ascending: true })

  // Resolve all referenced user IDs
  const userIds = new Set<string>()
  if (task.reserved_for_id) userIds.add(task.reserved_for_id)
  attempts?.forEach(a => userIds.add(a.trainer_id))
  reviews?.forEach(r => userIds.add(r.reviewer_id))

  let userMap: Record<string, { email: string; display_name: string }> = {}
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('user_id, email, display_name')
      .in('user_id', [...userIds])
    if (users) users.forEach(u => { userMap[u.user_id] = { email: u.email, display_name: u.display_name } })
  }

  return {
    task,
    attempts: attempts ?? [],
    reviews: reviews ?? [],
    userMap,
  }
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

// Admin: remove a task from its current trainer (even if in_progress) and make it available again.
export async function adminDisclaimTask(taskId: string) {
  await checkAdmin()
  const supabase = await createClient()

  // Delete the unsubmitted attempt so the next trainer starts fresh
  await supabase
    .from('task_attempts')
    .delete()
    .eq('task_id', taskId)
    .is('submitted_at', null)

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'available' as const, reserved_for_id: null })
    .eq('task_id', taskId)
  if (error) throw error
}

// Admin: reassign a task (even if in_progress) to a different expert.
export async function adminReassignTask(taskId: string, newExpertId: string) {
  await checkAdmin()
  const supabase = await createClient()

  await supabase
    .from('task_attempts')
    .delete()
    .eq('task_id', taskId)
    .is('submitted_at', null)

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'reserved' as const, reserved_for_id: newExpertId })
    .eq('task_id', taskId)
  if (error) throw error
}

export async function uploadTaskDataset(tasks: { external_id: string, question: string }[], batchId: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .upsert(
      tasks.map(t => ({
        external_id: t.external_id,
        question: t.question,
        batch_id: batchId,
        status: 'available' as const
      })),
      { onConflict: 'external_id' }
    )

  if (error) throw error
  return data
}
