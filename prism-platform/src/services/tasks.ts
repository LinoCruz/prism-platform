import { createClient } from '@/lib/supabase/server'

export async function getAvailableTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_versions!task_versions_task_id_fkey(*)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTaskById(taskId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_versions!task_versions_task_id_fkey(*)')
    .eq('task_id', taskId)
    .single()
  if (error) throw error
  return data
}

export async function getMyTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_attempts')
    .select('*, tasks(*, task_versions!task_versions_task_id_fkey(*))')
    .eq('trainer_id', user.id)
    .order('claimed_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTasksForReview() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_versions!task_versions_task_id_fkey(*), task_attempts(*)')
    .eq('status', 'in_review')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function claimTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get the next attempt number
  const { count } = await supabase
    .from('task_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)

  const { data, error } = await supabase
    .from('task_attempts')
    .insert({
      task_id: taskId,
      trainer_id: user.id,
      attempt_number: (count ?? 0) + 1,
    })
    .select()
    .single()
  if (error) throw error

  // Update task status to claimed
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'claimed' })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}

export async function submitTask(taskId: string, versionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_attempts')
    .update({ submitted_at: new Date().toISOString(), version_id: versionId })
    .eq('task_id', taskId)
    .eq('trainer_id', user.id)
    .is('submitted_at', null)
    .select()
    .single()
  if (error) throw error

  // Update task status to in_review
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'in_review', current_version_id: versionId })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}
