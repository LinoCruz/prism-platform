import { createClient } from '@/lib/supabase/server'
import type { Enums } from '@/types/database.types'

export async function getMyReviews() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('task_reviews')
    .select('*, tasks(*), task_versions(*)')
    .eq('reviewer_id', user.id)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

export async function startReview(taskId: string, versionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { count } = await supabase
    .from('task_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('task_id', taskId)

  const { data, error } = await supabase
    .from('task_reviews')
    .insert({
      task_id: taskId,
      version_id: versionId,
      reviewer_id: user.id,
      review_number: (count ?? 0) + 1,
    })
    .select()
    .single()
  if (error) throw error

  // Mark task as in_review once a reviewer picks it up
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: 'in_review' })
    .eq('task_id', taskId)
  if (statusError) throw statusError

  return data
}

export async function completeReview(
  reviewId: string,
  decision: Enums<'review_decision'>,
  score: number,
  feedback: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch the review to get task_id, then fetch the task's current version
  const { data: review, error: reviewFetchError } = await supabase
    .from('task_reviews')
    .select('task_id, tasks(current_version_id)')
    .eq('review_id', reviewId)
    .single()
  if (reviewFetchError) throw reviewFetchError

  const currentVersionId = (review.tasks as { current_version_id: string | null })?.current_version_id
  if (!currentVersionId) throw new Error('Task has no current version to snapshot')

  // Fetch current version data and version count for the new version number
  const [{ data: currentVersion, error: versionError }, { count: versionCount }] = await Promise.all([
    supabase.from('task_versions').select('data_payload, version_number').eq('version_id', currentVersionId).single(),
    supabase.from('task_versions').select('*', { count: 'exact', head: true }).eq('task_id', review.task_id),
  ])
  if (versionError) throw versionError

  // Create reviewer snapshot — captures the content at the moment of decision
  const { data: snapshot, error: snapshotError } = await supabase
    .from('task_versions')
    .insert({
      task_id: review.task_id,
      version_number: (versionCount ?? 0) + 1,
      created_by_user_id: user.id,
      source: 'reviewer',
      parent_version_id: currentVersionId,
      data_payload: currentVersion.data_payload,
    })
    .select('version_id')
    .single()
  if (snapshotError) throw snapshotError

  // Complete the review and link the snapshot in one update
  const { data, error } = await supabase
    .from('task_reviews')
    .update({
      decision,
      score,
      feedback,
      completed_at: new Date().toISOString(),
      snapshot_version_id: snapshot.version_id,
    })
    .eq('review_id', reviewId)
    .select()
    .single()
  if (error) throw error

  // Update task status and current_version_id based on decision
  const nextStatus = decision === 'approved' ? 'signed_off' : 'sent_for_rework'
  const { error: statusError } = await supabase
    .from('tasks')
    .update({ status: nextStatus, current_version_id: snapshot.version_id })
    .eq('task_id', data.task_id)
  if (statusError) throw statusError

  return data
}

export async function getMyAudits() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_audits')
    .select('*, task_reviews(*, tasks(*))')
    .eq('auditor_id', user.id)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

export async function startAudit(reviewId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('review_audits')
    .insert({ review_id: reviewId, auditor_id: user.id })
    .select('*, task_reviews(task_id)')
    .single()
  if (error) throw error

  const taskId = (data.task_reviews as { task_id: string })?.task_id
  if (taskId) {
    const { error: statusError } = await supabase
      .from('tasks')
      .update({ status: 'auditing' })
      .eq('task_id', taskId)
    if (statusError) throw statusError
  }

  return data
}

export async function completeAudit(
  auditId: string,
  decision: Enums<'audit_decision'>,
  score: number,
  feedback: string,
  action: Enums<'audit_action'>,
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('review_audits')
    .update({
      decision,
      score,
      feedback,
      action,
      completed_at: new Date().toISOString(),
    })
    .eq('audit_id', auditId)
    .select('*, task_reviews(task_id)')
    .single()
  if (error) throw error

  // approved → passed_audit; anything else → reviewer_fixing (reviewer must address audit feedback)
  const nextStatus = action === 'approve' ? 'passed_audit' : 'reviewer_fixing'
  const taskId = (data.task_reviews as { task_id: string })?.task_id
  if (taskId) {
    const { error: statusError } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('task_id', taskId)
    if (statusError) throw statusError
  }

  return data
}
