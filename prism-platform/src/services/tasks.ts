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

export async function getMyTasks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_attempts')
    .select('attempt_id, task_id, submitted_at, tasks(task_id, external_id, status, question)')
    .eq('trainer_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getTasksForReview() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_versions!task_versions_task_id_fkey(*), task_attempts(*)')
    .eq('status', 'completed')
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

// Start a task: creates the attempt and marks the task as claimed.
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
    .update({ status: 'claimed' })
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

// Finish a task: marks the attempt as submitted, saves QA data, and moves status to completed.
export async function finishTask(taskId: string, qaData: TaskQAData) {
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

  const nextStatus = task.status === 'sent_for_rework' ? 'fixed' : 'completed'

  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: nextStatus, current_version_id: versionId })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}
