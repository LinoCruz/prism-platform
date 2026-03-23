import { createClient } from '@/lib/supabase/server'
import type { TaskQAData } from '@/app/tasks/actions'

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

export async function getInProgressTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('tasks')
    .select('task_id, external_id, status, question')
    .in('status', ['claimed', 'reworking'])
    .eq('reserved_for_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getReworkTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('tasks')
    .select('task_id, external_id, status, question')
    .eq('status', 'sent_for_rework')
    .eq('reserved_for_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getMyTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_attempts')
    .select('attempt_id, task_id, claimed_at, submitted_at, tasks(task_id, external_id, status, question)')
    .eq('trainer_id', user.id)
    .not('submitted_at', 'is', null)
    .order('claimed_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTasksForReview() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_versions!task_versions_task_id_fkey(*), task_attempts(*)')
    .in('status', ['completed', 'fixed'])
    .order('created_at', { ascending: true })
  if (error) throw error

  // Exclude tasks where the current reviewer was the trainer
  return data.filter(
    (task) => !task.task_attempts.some((attempt: { trainer_id: string }) => attempt.trainer_id === user.id)
  )
}

export async function claimTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get the next attempt number and current status in one query
  const [{ count }, { data: task, error: taskError }] = await Promise.all([
    supabase.from('task_attempts').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
    supabase.from('tasks').select('status').eq('task_id', taskId).single(),
  ])
  if (taskError) throw taskError

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

  // Rework re-claim → reworking; first claim → claimed
  const nextStatus = task.status === 'sent_for_rework' ? 'reworking' : 'claimed'
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: nextStatus })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}

// Start a task: creates the attempt and marks the task as claimed.
// Called when the trainer clicks "Claim Task" or "Resume".
// Idempotent: if an unsubmitted attempt already exists (e.g. after a tab close),
// it returns the existing attempt instead of creating a duplicate.
export async function startTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: existing }, { count }, { data: task, error: taskError }] = await Promise.all([
    supabase.from('task_attempts').select('*').eq('task_id', taskId).eq('trainer_id', user.id).is('submitted_at', null).maybeSingle(),
    supabase.from('task_attempts').select('*', { count: 'exact', head: true }).eq('task_id', taskId),
    supabase.from('tasks').select('status').eq('task_id', taskId).single(),
  ])
  if (taskError) throw taskError

  // Resume case: unsubmitted attempt already exists — reuse it, no new attempt needed
  if (existing) return existing

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

  // Rework re-claim → reworking; first claim → claimed
  const nextStatus = task.status === 'sent_for_rework' ? 'reworking' : 'claimed'
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: nextStatus })
    .eq('task_id', taskId)
    .eq('reserved_for_id', user.id)
  if (statusError) throw statusError

  return data
}

// Cancel a task: deletes the unsubmitted attempt and reverts the task to reserved.
// Cancel is not a status — it means the expert closed the modal without submitting.
// No attempt data is persisted.
export async function cancelTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Update status first — if this fails, the attempt stays intact and the task
  // remains in the correct state. Deleting the attempt before the status update
  // could leave the task in `claimed`/`reworking` with no unsubmitted attempt.
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'reserved' })
    .eq('task_id', taskId)
    .eq('reserved_for_id', user.id)
  if (error) throw error

  await supabase
    .from('task_attempts')
    .delete()
    .eq('task_id', taskId)
    .eq('trainer_id', user.id)
    .is('submitted_at', null)
}

// Finish a task: marks the attempt as submitted, saves QA data, and moves status to completed.
export async function finishTask(taskId: string, qaData: TaskQAData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: updatedAttempts, error: attemptError } = await supabase
    .from('task_attempts')
    .update({ submitted_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .eq('trainer_id', user.id)
    .is('submitted_at', null)
    .select('attempt_id')
  if (attemptError) throw attemptError
  if (!updatedAttempts || updatedAttempts.length === 0) {
    throw new Error('No active attempt found for this task. Please refresh the page and try again.')
  }

  const { error: qaError } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      original_question: qaData.original_question || null,
      original_answer: qaData.original_answer || null,
      is_question_valid: qaData.is_question_valid,
      question_invalid_reason: qaData.question_invalid_reason,
      new_question: qaData.new_question,
      is_answer_valid: qaData.is_answer_valid,
      answer_invalid_reason: qaData.answer_invalid_reason,
      new_answer: qaData.new_answer,
      is_temporal: qaData.is_temporal,
    })
    .eq('task_id', taskId)
  if (qaError) throw qaError

  if (qaData.is_temporal && qaData.temporal_values.length > 0) {
    const { error: temporalError } = await supabase
      .from('task_temporal_values')
      .insert(qaData.temporal_values.map((value) => ({ task_id: taskId, value })))
    if (temporalError) throw temporalError
  }
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

  // If the task was sent for rework and is being resubmitted, mark it as fixed.
  // Otherwise it's a first submission → completed (awaiting reviewer pick-up).
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('status')
    .eq('task_id', taskId)
    .single()
  if (taskError) throw taskError

  const nextStatus = task.status === 'reworking' ? 'fixed' : 'completed'

  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: nextStatus, current_version_id: versionId })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}
