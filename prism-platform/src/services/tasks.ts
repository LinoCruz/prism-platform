import { createClient } from '@/lib/supabase/server'

export async function getAvailableTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_versions!task_versions_task_id_fkey(*)')
    .eq('status', 'reserved')
    .eq('reserved_for_id', user.id)
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
    .select('attempt_id, task_id, submitted_at, tasks(task_id, external_id, status, question)')
    .eq('trainer_id', user.id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
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

// Start a task: creates the attempt and marks the task as in_progress.
// Called immediately when the trainer clicks "Claim Task" (modal opens).
export async function startTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

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

  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'in_progress' })
    .eq('task_id', taskId)
    .eq('reserved_for_id', user.id)
  if (statusError) throw statusError

  return data
}

// Cancel a task: removes the unsubmitted attempt and reverts status to reserved.
export async function cancelTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase
    .from('task_attempts')
    .delete()
    .eq('task_id', taskId)
    .eq('trainer_id', user.id)
    .is('submitted_at', null)

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'reserved' })
    .eq('task_id', taskId)
    .eq('reserved_for_id', user.id)
  if (error) throw error
}

// Finish a task: marks the attempt as submitted and moves status to claimed.
export async function finishTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error: attemptError } = await supabase
    .from('task_attempts')
    .update({ submitted_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('trainer_id', user.id)
    .is('submitted_at', null)
  if (attemptError) throw attemptError

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'claimed' })
    .eq('task_id', taskId)
  if (error) throw error
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
